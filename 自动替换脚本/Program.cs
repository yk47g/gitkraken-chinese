using System.Runtime.InteropServices;
using System.Text.RegularExpressions;

namespace GitKrakenPatcher;

/// <summary>
/// GitKraken 中文汉化补丁安装工具。
/// <para>自动查找汉化源文件和 GitKraken 安装路径，完成 strings.json 的备份与替换。</para>
/// </summary>
internal static class Program
{
    /// <summary>
    /// GitKraken 使用的本地化文件名。
    /// </summary>
    private const string TargetFileName = "strings.json";

    /// <summary>
    /// 匹配带版本号的汉化源文件名，如 <c>strings_12.0.1.json</c>。
    /// </summary>
    private static readonly Regex SrcPattern = new(@"^strings_(\d+\.\d+\.\d+)\.json$", RegexOptions.Compiled);

    /// <summary>
    /// 程序入口。依次执行：查找汉化源文件 → 查找 GitKraken 安装路径 → 备份并替换 strings.json。
    /// </summary>
    private static void Main()
    {
        Console.OutputEncoding = System.Text.Encoding.UTF8;
        Console.WriteLine("=== GitKraken 中文汉化补丁安装工具 ===");
        Console.WriteLine();

        // 1. 查找汉化源文件
        var projectRoot = FindProjectRoot();
        var (srcFile, version) = FindSourceJson(projectRoot);
        if (srcFile == null)
        {
            ExitWithError($"在目录 {projectRoot} 中找不到 strings.json 或 strings_x.x.x.json 文件。\n请确保该工具与汉化文件放在同一目录下。");
            return;
        }

        Console.WriteLine($"找到汉化文件: {Path.GetFileName(srcFile)} (版本 {version})");

        // 2. 查找 GitKraken 安装路径
        Console.WriteLine("正在查找 GitKraken 安装路径...");
        var targets = FindGitKrakenPaths();

        if (targets.Count == 0)
        {
            Console.WriteLine();
            Console.WriteLine("[提示] 未自动找到 GitKraken 安装路径。");
            Console.WriteLine("请手动输入 GitKraken 中 strings.json 的完整路径（留空退出）:");
            Console.Write("> ");
            var manual = Console.ReadLine()?.Trim();
            if (string.IsNullOrEmpty(manual))
            {
                Console.WriteLine("已取消操作。");
                WaitExit();
                return;
            }

            if (File.Exists(manual) && Path.GetFileName(manual).Equals(TargetFileName, StringComparison.OrdinalIgnoreCase))
            {
                targets.Add(manual);
            }
            else
            {
                ExitWithError($"路径无效或文件名不是 {TargetFileName}: {manual}");
                return;
            }
        }

        Console.WriteLine($"\n找到 {targets.Count} 个 strings.json，正在替换...");

        // 3. 执行替换
        var successCount = 0;
        foreach (var target in targets)
        {
            Console.WriteLine($"\n正在替换: {target}");

            // 备份原文件
            var backupPath = target + ".bak";
            if (!File.Exists(backupPath))
            {
                try
                {
                    File.Copy(target, backupPath, false);
                    Console.WriteLine($"  已备份原文件至: {Path.GetFileName(backupPath)}");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"  [警告] 备份失败: {ex.Message} (跳过此文件)");
                    continue;
                }
            }
            else
            {
                Console.WriteLine("  备份文件已存在，跳过备份。");
            }

            // 复制汉化文件
            try
            {
                File.Copy(srcFile, target, true);
                Console.WriteLine("  [成功] 替换完成！");
                successCount++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [失败] 替换失败: {ex.Message}");
            }
        }

        Console.WriteLine($"\n完成！成功替换 {successCount}/{targets.Count} 个文件。");
        if (successCount > 0)
        {
            Console.WriteLine("请重启 GitKraken 以应用汉化。");
        }

        WaitExit();
    }

    /// <summary>
    /// 查找项目根目录（优先可执行文件所在目录，其次当前工作目录）。
    /// </summary>
    private static string FindProjectRoot()
    {
        // 从可执行文件所在目录和当前工作目录分别向上查找，最多 3 级父目录
        // 覆盖场景：Release 下载（同目录）、克隆仓库编译（自动替换脚本/publish/<rid>/）
        var candidates = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var exeDir = AppContext.BaseDirectory.TrimEnd(Path.DirectorySeparatorChar);
        var cwd = Directory.GetCurrentDirectory();

        foreach (var startDir in new[] { exeDir, cwd })
        {
            var dir = startDir;
            for (var i = 0; i < 4 && dir != null; i++)
            {
                if (candidates.Add(dir) && HasSourceJson(dir))
                    return dir;
                dir = Directory.GetParent(dir)?.FullName;
            }
        }

        return exeDir;
    }

    /// <summary>
    /// 判断指定目录中是否存在汉化源文件（<c>strings_x.x.x.json</c> 或 <c>strings.json</c>）。
    /// </summary>
    /// <param name="dir">要检查的目录路径。</param>
    /// <returns>存在汉化源文件时返回 <c>true</c>。</returns>
    private static bool HasSourceJson(string dir)
    {
        try
        {
            // 优先匹配 strings_x.x.x.json，其次匹配 strings.json
            return Directory.GetFiles(dir, "strings_*.json")
                       .Any(f => SrcPattern.IsMatch(Path.GetFileName(f)))
                   || File.Exists(Path.Combine(dir, TargetFileName));
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// 在指定目录中查找汉化源文件。优先选择版本号最高的 <c>strings_x.x.x.json</c>，
    /// 若不存在则回退到 <c>strings.json</c>。
    /// </summary>
    /// <param name="dir">要搜索的目录路径。</param>
    /// <returns>
    /// 找到的文件路径和版本号（纯 <c>strings.json</c> 时版本为 <c>"unknown"</c>）；未找到时均为 <c>null</c>。
    /// </returns>
    private static (string? path, string? version) FindSourceJson(string dir)
    {
        try
        {
            var files = Directory.GetFiles(dir, "strings_*.json")
                .Select(f => new { Path = f, Match = SrcPattern.Match(Path.GetFileName(f)) })
                .Where(x => x.Match.Success)
                .Select(x => new { x.Path, Version = x.Match.Groups[1].Value })
                .OrderByDescending(x => x.Version, new VersionComparer())
                .ToList();

            if (files.Count > 0)
                return (files[0].Path, files[0].Version);
        }
        catch
        {
            // ignored
        }

        // 回退：查找不带版号的 strings.json
        var plain = Path.Combine(dir, TargetFileName);
        if (File.Exists(plain))
            return (plain, "unknown");

        return (null, null);
    }

    /// <summary>
    /// 根据当前操作系统，自动查找 GitKraken 安装目录下所有 <c>strings.json</c> 的完整路径。
    /// </summary>
    /// <returns>找到的所有 <c>strings.json</c> 路径列表（已去重）。</returns>
    private static List<string> FindGitKrakenPaths()
    {
        var results = new List<string>();

        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            FindGitKrakenWindows(results);
        else if (RuntimeInformation.IsOSPlatform(OSPlatform.OSX))
            FindGitKrakenMacOS(results);
        else if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
            FindGitKrakenLinux(results);
        else
            Console.WriteLine($"不支持的操作系统: {RuntimeInformation.OSDescription}");

        return results.Distinct().ToList();
    }

    /// <summary>
    /// 在 Windows 系统中查找 GitKraken 的 <c>strings.json</c>。
    /// <para>搜索 <c>%LOCALAPPDATA%</c>、<c>%PROGRAMFILES%</c>、<c>%PROGRAMFILES(x86)%</c> 下的
    /// <c>app-*</c> 版本目录，仅取版本号最高的目录。</para>
    /// </summary>
    /// <param name="results">用于收集找到的文件路径。</param>
    private static void FindGitKrakenWindows(List<string> results)
    {
        var searchRoots = new List<string>();

        // %LOCALAPPDATA%\gitkraken (默认安装位置)
        var localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        if (!string.IsNullOrEmpty(localAppData))
            searchRoots.Add(Path.Combine(localAppData, "gitkraken"));

        // %PROGRAMFILES%
        var programFiles = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
        if (!string.IsNullOrEmpty(programFiles))
            searchRoots.Add(Path.Combine(programFiles, "GitKraken"));

        // %PROGRAMFILES(x86)%
        var programFilesX86 = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86);
        if (!string.IsNullOrEmpty(programFilesX86))
            searchRoots.Add(Path.Combine(programFilesX86, "GitKraken"));

        foreach (var root in searchRoots)
        {
            if (!Directory.Exists(root))
                continue;

            try
            {
                // 有版号目录，只取最新版本（按版本号排序，而非字符串）
                var latestAppDir = Directory.GetDirectories(root, "app-*")
                    .OrderByDescending(d => Path.GetFileName(d).Substring(4), new VersionComparer())
                    .FirstOrDefault();

                if (latestAppDir == null)
                    continue;

                var path1 = Path.Combine(latestAppDir, "resources", "app", "src", TargetFileName);
                if (File.Exists(path1))
                    results.Add(path1);

                var path2 = Path.Combine(latestAppDir, "resources", "app.asar.unpacked", "src", TargetFileName);
                if (File.Exists(path2))
                    results.Add(path2);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [警告] 搜索 {root} 时出错: {ex.Message}");
            }
        }
    }

    /// <summary>
    /// 在 macOS 系统中查找 GitKraken 的 <c>strings.json</c>。
    /// <para>搜索系统级和用户级 Applications 目录。</para>
    /// </summary>
    /// <param name="results">用于收集找到的文件路径。</param>
    private static void FindGitKrakenMacOS(List<string> results)
    {
        var basePaths = new[]
        {
            "/Applications/GitKraken.app/Contents/Resources",
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
                "Applications/GitKraken.app/Contents/Resources")
        };

        foreach (var basePath in basePaths)
        {
            if (!Directory.Exists(basePath))
                continue;

            var path1 = Path.Combine(basePath, "app", "src", TargetFileName);
            if (File.Exists(path1))
                results.Add(path1);

            var path2 = Path.Combine(basePath, "app.asar.unpacked", "src", TargetFileName);
            if (File.Exists(path2))
                results.Add(path2);
        }
    }

    /// <summary>
    /// 在 Linux 系统中查找 GitKraken 的 <c>strings.json</c>。
    /// <para>搜索 deb、AUR、Snap、Flatpak（系统级和用户级）等常见安装路径。</para>
    /// </summary>
    /// <param name="results">用于收集找到的文件路径。</param>
    private static void FindGitKrakenLinux(List<string> results)
    {
        var basePaths = new[]
        {
            // deb 安装 (Deepin 等)
            "/usr/share/gitkraken/resources",
            // AUR 安装 (Arch Linux)
            "/opt/gitkraken/resources",
            // Snap 安装
            "/snap/gitkraken/current/resources",
            // Flatpak 安装
            "/var/lib/flatpak/app/com.axosoft.GitKraken/current/active/files/extra/gitkraken/resources"
        };

        // 也检查用户级 Flatpak
        var homeDir = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
        if (!string.IsNullOrEmpty(homeDir))
        {
            basePaths =
            [
                ..basePaths,
                Path.Combine(homeDir,
                    ".local/share/flatpak/app/com.axosoft.GitKraken/current/active/files/extra/gitkraken/resources")
            ];
        }

        foreach (var basePath in basePaths)
        {
            if (!Directory.Exists(basePath))
                continue;

            var path1 = Path.Combine(basePath, "app", "src", TargetFileName);
            if (File.Exists(path1))
                results.Add(path1);

            var path2 = Path.Combine(basePath, "app.asar.unpacked", "src", TargetFileName);
            if (File.Exists(path2))
                results.Add(path2);
        }
    }

    /// <summary>
    /// 输出错误信息并等待用户按键后退出。
    /// </summary>
    /// <param name="message">要显示的错误信息。</param>
    private static void ExitWithError(string message)
    {
        Console.WriteLine();
        Console.WriteLine($"[错误] {message}");
        WaitExit();
    }

    /// <summary>
    /// 显示"按任意键退出"提示并等待用户按键。
    /// </summary>
    private static void WaitExit()
    {
        Console.WriteLine();
        Console.WriteLine("按任意键退出...");
        Console.ReadKey(true);
    }

    /// <summary>
    /// 语义化版本号比较器，按数值逐段比较（如 <c>"12.0.1" &gt; "11.10.0" &gt; "9.5.1"</c>）。
    /// </summary>
    private class VersionComparer : IComparer<string>
    {
        /// <inheritdoc />
        public int Compare(string? x, string? y)
        {
            if (x == null && y == null) return 0;
            if (x == null) return -1;
            if (y == null) return 1;

            var partsX = x.Split('.').Select(int.Parse).ToArray();
            var partsY = y.Split('.').Select(int.Parse).ToArray();
            var maxLen = Math.Max(partsX.Length, partsY.Length);

            for (var i = 0; i < maxLen; i++)
            {
                var vx = i < partsX.Length ? partsX[i] : 0;
                var vy = i < partsY.Length ? partsY[i] : 0;
                if (vx != vy) return vx.CompareTo(vy);
            }

            return 0;
        }
    }
}
