using System.Runtime.InteropServices;
using System.Text.RegularExpressions;

namespace GitKrakenPatcher;

internal static class Program
{
    private const string TargetFileName = "strings.json";
    private static readonly Regex SrcPattern = new(@"^strings_(\d+\.\d+\.\d+)\.json$", RegexOptions.Compiled);

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
            ExitWithError($"在目录 {projectRoot} 中找不到 strings_x.x.x.json 文件。\n请确保该工具与 strings_x.x.x.json 放在同一目录下。");
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
        // 优先使用可执行文件所在目录
        var exeDir = AppContext.BaseDirectory;
        if (HasSourceJson(exeDir))
            return exeDir;

        // 回退到当前工作目录（从源码 dotnet run 时）
        var cwd = Directory.GetCurrentDirectory();
        if (HasSourceJson(cwd))
            return cwd;

        // 如果都没有，检查上级目录（install 文件夹在项目根目录内）
        var parentOfExe = Directory.GetParent(exeDir)?.FullName;
        if (parentOfExe != null && HasSourceJson(parentOfExe))
            return parentOfExe;

        var parentOfCwd = Directory.GetParent(cwd)?.FullName;
        if (parentOfCwd != null && HasSourceJson(parentOfCwd))
            return parentOfCwd;

        return exeDir;
    }

    private static bool HasSourceJson(string dir)
    {
        try
        {
            return Directory.GetFiles(dir, "strings_*.json")
                .Any(f => SrcPattern.IsMatch(Path.GetFileName(f)));
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// 在指定目录中找到版本号最高的 strings_x.x.x.json。
    /// </summary>
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

        return (null, null);
    }

    /// <summary>
    /// 根据操作系统查找 GitKraken 的 strings.json 路径。
    /// </summary>
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
                // 有版号目录，只取最新版本
                var latestAppDir = Directory.GetDirectories(root, "app-*")
                    .OrderByDescending(d => Path.GetFileName(d))
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

    private static void ExitWithError(string message)
    {
        Console.WriteLine();
        Console.WriteLine($"[错误] {message}");
        WaitExit();
    }

    private static void WaitExit()
    {
        Console.WriteLine();
        Console.WriteLine("按任意键退出...");
        Console.ReadKey(true);
    }

    /// <summary>
    /// 版本号比较器，用于排序 "12.0.1" > "11.10.0" 等。
    /// </summary>
    private class VersionComparer : IComparer<string>
    {
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
