using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

// Lightweight stub — no window, no taskbar entry.
// Sets a custom AppUserModelID + icon directly on the VSCode window,
// then watches for it to close.

static class Program
{
    // ── Win32 / Shell imports ─────────────────────────────────────────────

    [DllImport("user32.dll")]
    static extern bool EnumWindows(EnumWindowsProc fn, IntPtr lParam);
    delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll")]
    static extern bool IsWindow(IntPtr hWnd);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    static extern int GetWindowText(IntPtr hWnd, StringBuilder sb, int max);

    [DllImport("user32.dll")]
    static extern int GetWindowTextLength(IntPtr hWnd);

    [DllImport("user32.dll")]
    static extern IntPtr SendMessage(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam);

    // LoadImage with LR_LOADFROMFILE — HICON is a USER object, visible across processes
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    static extern IntPtr LoadImage(IntPtr hinst, string name, uint type, int cx, int cy, uint flags);

    [DllImport("shell32.dll")]
    static extern int SHGetPropertyStoreForWindow(
        IntPtr hwnd, ref Guid riid,
        [Out, MarshalAs(UnmanagedType.Interface)] out object ppv);

    // ── COM: IPropertyStore ───────────────────────────────────────────────

    [ComImport, Guid("886D8EEB-8CF2-4446-8D02-CDBA1DBDCF99"),
     InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IPropertyStore
    {
        [PreserveSig] int GetCount(out int c);
        [PreserveSig] int GetAt(int i, out PROPERTYKEY k);
        [PreserveSig] int GetValue(ref PROPERTYKEY k, out PROPVARIANT v);
        [PreserveSig] int SetValue(ref PROPERTYKEY k, ref PROPVARIANT v);
        [PreserveSig] int Commit();
    }

    [StructLayout(LayoutKind.Sequential)]
    struct PROPERTYKEY { public Guid fmtid; public uint pid; }

    // VT_LPWSTR layout for 64-bit
    [StructLayout(LayoutKind.Explicit, Size = 16)]
    struct PROPVARIANT
    {
        [FieldOffset(0)] public ushort vt;
        [FieldOffset(8)] public IntPtr ptr;
    }

    // PKEY_AppUserModel_ID = {9F4C2855...}, pid 5
    static readonly Guid   IID_IPropertyStore = new("886D8EEB-8CF2-4446-8D02-CDBA1DBDCF99");
    static readonly PROPERTYKEY PKEY_AppUserModel_ID = new()
    {
        fmtid = new Guid("9F4C2855-9F79-4B39-A8D0-E1D42DE1D5F3"),
        pid   = 5
    };

    const uint WM_SETICON      = 0x0080;
    const uint IMAGE_ICON      = 1;
    const uint LR_LOADFROMFILE = 0x0010;
    const uint LR_DEFAULTSIZE  = 0x0040;

    // ── Entry point ───────────────────────────────────────────────────────

    [STAThread]
    static void Main(string[] args)
    {
        string workspace = GetArg(args, "--workspace") ?? "";
        string appId     = GetArg(args, "--app-id")    ?? "codespacelauncher.workspace";
        string iconPath  = GetArg(args, "--icon")      ?? "";

        if (string.IsNullOrWhiteSpace(workspace)) return;

        // Derive a key to identify the correct VSCode window by title
        string workspaceKey = Path.GetFileNameWithoutExtension(workspace.TrimEnd('\\', '/'));
        if (string.IsNullOrEmpty(Path.GetExtension(workspace.TrimEnd('\\', '/'))))
            workspaceKey = new DirectoryInfo(workspace.TrimEnd('\\', '/')).Name;

        // Snapshot existing VSCode windows before launching so we can identify the NEW one.
        // This prevents the stub from stamping an already-open window whose title happens
        // to contain the workspace key as a substring.
        var existingWindows = new HashSet<IntPtr>();
        EnumWindows((h, _) =>
        {
            if (IsWindowVisible(h) && IsVSCodeWindow(h, workspaceKey))
                existingWindows.Add(h);
            return true;
        }, IntPtr.Zero);

        LaunchVSCode(workspace);

        // Wait up to 30s for a NEW VSCode window with the workspace name to appear.
        IntPtr hwnd = IntPtr.Zero;
        for (int i = 0; i < 300 && hwnd == IntPtr.Zero; i++)
        {
            Thread.Sleep(100);
            hwnd = FindVSCodeWindow(workspaceKey, existingWindows);
        }

        if (hwnd == IntPtr.Zero) return;

        // Give VSCode a moment to fully initialise before we touch its properties
        Thread.Sleep(1000);

        // 1. Set unique AppUserModelID on the VSCode window.
        //    This separates it from other VSCode instances in the taskbar.
        SetAppUserModelId(hwnd, appId);

        // 2. Replace the window icon so the taskbar button shows our custom icon.
        //    HICON is a USER object — valid across processes.
        //    Apply multiple times to survive VSCode resetting its icon during workspace load.
        IntPtr hIcon = IntPtr.Zero;
        if (!string.IsNullOrEmpty(iconPath) && File.Exists(iconPath))
            hIcon = LoadImage(IntPtr.Zero, iconPath, IMAGE_ICON, 0, 0, LR_LOADFROMFILE | LR_DEFAULTSIZE);

        void StampIcon()
        {
            if (hIcon != IntPtr.Zero)
            {
                SendMessage(hwnd, WM_SETICON, (IntPtr)1, hIcon); // ICON_BIG
                SendMessage(hwnd, WM_SETICON, (IntPtr)0, hIcon); // ICON_SMALL
            }
        }

        StampIcon();

        // Re-stamp after short delays to survive VSCode's own post-load icon resets
        Thread.Sleep(1500); StampIcon();
        Thread.Sleep(3000); StampIcon();

        // 3. Stay alive (holding the HICON in memory) until the window closes
        while (IsWindow(hwnd))
            Thread.Sleep(500);
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    static void SetAppUserModelId(IntPtr hwnd, string appId)
    {
        try
        {
            var riid = IID_IPropertyStore;
            SHGetPropertyStoreForWindow(hwnd, ref riid, out var obj);
            var store = (IPropertyStore)obj;

            var key = PKEY_AppUserModel_ID;
            var pv  = new PROPVARIANT { vt = 31, ptr = Marshal.StringToCoTaskMemUni(appId) };
            store.SetValue(ref key, ref pv);
            store.Commit();
            Marshal.FreeCoTaskMem(pv.ptr);
        }
        catch { }
    }

    static void LaunchVSCode(string workspacePath)
    {
        try
        {
            Process.Start(new ProcessStartInfo
            {
                FileName        = "cmd.exe",
                Arguments       = $"/c code \"{workspacePath}\"",
                UseShellExecute = false,
                CreateNoWindow  = true
            });
        }
        catch { }
    }

    static bool IsVSCodeWindow(IntPtr hwnd, string key)
    {
        int len = GetWindowTextLength(hwnd);
        if (len == 0) return false;
        var sb = new StringBuilder(len + 1);
        GetWindowText(hwnd, sb, sb.Capacity);
        var title = sb.ToString();
        if (!title.Contains("Visual Studio Code", StringComparison.OrdinalIgnoreCase)) return false;
        if (!string.IsNullOrEmpty(key) &&
            !title.Contains(key, StringComparison.OrdinalIgnoreCase)) return false;
        return true;
    }

    static IntPtr FindVSCodeWindow(string key, HashSet<IntPtr> exclude = null)
    {
        IntPtr found = IntPtr.Zero;
        EnumWindows((hwnd, _) =>
        {
            if (!IsWindowVisible(hwnd)) return true;
            if (exclude != null && exclude.Contains(hwnd)) return true;
            if (!IsVSCodeWindow(hwnd, key)) return true;
            found = hwnd;
            return false;
        }, IntPtr.Zero);
        return found;
    }

    static string? GetArg(string[] args, string key)
    {
        for (int i = 0; i < args.Length - 1; i++)
            if (args[i] == key) return args[i + 1];
        return null;
    }
}
