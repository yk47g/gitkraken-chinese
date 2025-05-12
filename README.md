# gitkraken-chinese

GitKraken的中文汉化补丁

[说明](#说明) | [更新](#更新) | [原理](#原理) | [操作步骤](#操作步骤) | [意见征集](#意见征集)

## 说明

自从用上了 GitKraken 就爱上了，卸载了其他相关 Git 的 GUI，它的界面非常合我的胃口，但是苦于官方没有中文简体，于是便有了汉化的想法。

## 更新

<details>
<summary>
<strong>更新日志</strong>
</summary>

|       日期        | 更新内容                                                                          |                                                               感谢                                                               |
|:---------------:|-------------------------------------------------------------------------------|:------------------------------------------------------------------------------------------------------------------------------:|
| 2024.02.27 - 现在 | 适配 9.12.0+ 版本。                                                                |                                           [@YuanXiQWQ](https://github.com/YuanXiQWQ)                                           |
|   2025.05.12    | 修正中英标点混淆问题，规范代码中单双引号混淆的问题（HTML统一使用双引号，JS统一使用单引号）。                             |                                           [@YuanXiQWQ](https://github.com/YuanXiQWQ)                                           |
|   2025.04.01    | 毁灭了整个项目。                                                                      |                                           [@YuanXiQWQ](https://github.com/YuanXiQWQ)                                           |
|   2025.02.11    | 接入 DeepSeek API。                                                              |                                           [@YuanXiQWQ](https://github.com/YuanXiQWQ)                                           |
|   2025.01.22    | 更新 OpenAI 模型选项并完善提示词，修复差异比较逻辑无法检测删减与内容修改的问题并保留空行，优化可视化对比和界面交互。                |                                           [@YuanXiQWQ](https://github.com/YuanXiQWQ)                                           |
|   2025.01.20    | 根据 10.6.1 版本进行校对&修订。                                                          |                                           [@YuanXiQWQ](https://github.com/YuanXiQWQ)                                           |
|   2024.09.10    | 接入 OpenAI API，更新、优化使用说明和页面交互，新增文件上传/下载功能。                                     |                                           [@YuanXiQWQ](https://github.com/YuanXiQWQ)                                           |
|   2024.09.09    | 适配 10.3.0 版本。                                                                 | [@FXDYJ](https://github.com/FXDYJ) / [@Slinet6056](https://github.com/Slinet6056) / [@YuanXiQWQ](https://github.com/YuanXiQWQ) |
|   2024.02.27    | 明晰 compare.html（即现名 comparator.html）的使用说明和操作界面，可视化有道 API 配置，添加关于有道 API 的描述文件。 |                                           [@YuanXiQWQ](https://github.com/YuanXiQWQ)                                           |
|   2024.02.27    | 适配 9.11.1 版本。                                                                 |                                             [@Jaffrez](https://github.com/Jaffrez)                                             |
|   2024.02.27    | 适配 9.5.1 版本。                                                                  |                                             [@buck178](https://github.com/buck178)                                             |
|   2023.09.11    | 适配 9.5.1 版本。                                                                  |                                           [@star-andy](https://github.com/star-andy)                                           |
|   2021.12.17    | 新增可视化对比，接入有道翻译 API。                                                           |                                        [@TanxiangCode](https://github.com/TanxiangCode)                                        |
|   2021.03.18    | 新增对比新旧版本区别，自动生成新版本的 JSON 文件的工具 compare.html。                                  |                                         [@DreamSaddle](https://github.com/DreamSaddle)                                         |
|   2020.08.18    | 在 Windows 2.7.0 测试通过。                                                         |                                         [@Black-Spree](https://github.com/Black-Spree)                                         |
|   2019.10.01    | 在 macOS 10.14 GitKraken 6.2.0 测试通过。                                           |                                               [@yk47g](https://github.com/yk47g)                                               |

</details>

## 原理

通过修改软件目录下 English 语言对应的一个 JSON 文件内容来完成汉化目的。

（自动生成 JSON 工具已实现自动翻译。因 有道、OpenAI 和 DeepSeek 的 API 属于收费接口，故不提供 Key，有需要者请自行申请。申请方法详见 `comparator.html` - 使用说明）

## 操作步骤

按照以下步骤完成汉化操作：

### 1. 找到并替换语言文件

从项目根目录或 `./旧版本文件` 中找到与你当前 GitKraken 版本匹配的 `.json` 文件，将其重命名为 `strings.json`，并替换
GitKraken 安装目录下的 `strings.json` 文件。该文件的位置根据你的操作系统有所不同：

#### <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Windows_logo_-_2012.svg/1280px-Windows_logo_-_2012.svg.png" alt="Windows Icon" style="width: 18px; height: 18px;"> Windows （`x.x.x` 表示 GitKraken 版本号）

- `%程序安装目录%\gitkraken\app-x.x.x\resources\app\src\strings.json`
- `%程序安装目录%\gitkraken\app-x.x.x\resources\app.asar.unpacked\src\strings.json`

#### <img src="https://cdn-icons-png.flaticon.com/512/2/2235.png" alt="macOS Icon" style="width: 18px; height: 18px;"> macOS

- `/Applications/GitKraken.app/Contents/Resources/app/src/strings.json`
- `/Applications/GitKraken.app/Contents/Resources/app.asar.unpacked/src/strings.json`

#### <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Tux.svg/1024px-Tux.svg.png" alt="Linux Icon" style="width: 18px; height: 18px;"> Linux（不同安装方式下路径可能不同）

- （由[@lyydhy](https://github.com/lyydhy)补充）通过 `deb` 安装（例如 Deepin 系统），路径可能是：

  `/usr/share/gitkraken/resources/app.asar.unpacked/src/strings.json`
- 通过 `AUR` 安装（例如 Arch Linux），路径可能是：

  `/opt/gitkraken/resources/app.asar.unpacked/src/strings.json`

### 2. 重启 GitKraken

完成文件替换后，重启 GitKraken 即可生效。

## 意见征集

#### [加入讨论](https://github.com/yk47g/gitkraken-chinese/discussions/33)

在校对时发现，由于每次只是对新增/修改词汇上传来翻译，用词常有不统一的现象。翻阅 Git 中文社区，发现很多专有名词的翻译也很不统一。因此想开一个讨论看看大家的意见。
目前规定的如下：
> 带链接表示该翻译取自 [Git 官方中文文档](https://git-scm.com/book/zh/v2)，
> 带多个链接表示官中有多种翻译，
> 不带链接可能是因为该页面没有官中翻译或不是 Git 名词（但并不表示带链接的就一定是 Git 名词）。

#### 翻译：

| 序号 |       专有名词        |                                                                                               统一翻译                                                                                                |                                                                           其它翻译                                                                            |
|:--:|:-----------------:|:-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------:|:---------------------------------------------------------------------------------------------------------------------------------------------------------:|
| 1  |    Cherry Pick    |                                   [拣选](https://git-scm.com/book/zh/v2/%e5%88%86%e5%b8%83%e5%bc%8f-Git-%e7%bb%b4%e6%8a%a4%e9%a1%b9%e7%9b%ae#_rebase_cherry_pick)                                   |                                                                        挑拣、挑选、樱桃挑选                                                                         |
| 2  |       Email       |                                                                                                邮箱                                                                                                 |                                                                           电子邮件                                                                            |
| 3  |   Email Address   |                                                                                                邮箱                                                                                                 |                                                                          电子邮件地址                                                                           |
| 4  |      Filter       |         [过滤器](https://git-scm.com/book/zh/v2/Git-%E5%9F%BA%E7%A1%80-%E6%9F%A5%E7%9C%8B%E6%8F%90%E4%BA%A4%E5%8E%86%E5%8F%B2.html#_%E9%99%90%E5%88%B6%E8%BE%93%E5%87%BA%E9%95%BF%E5%BA%A6)          |                                                                            筛选器                                                                            |
| 5  |       Fork        |                                   [分支](https://git-scm.com/book/zh/v2/GitHub-%E5%AF%B9%E9%A1%B9%E7%9B%AE%E5%81%9A%E5%87%BA%E8%B4%A1%E7%8C%AE.html#_github_flow)                                   | 分叉、[派生](https://git-scm.com/book/zh/v2/GitHub-%E5%AF%B9%E9%A1%B9%E7%9B%AE%E5%81%9A%E5%87%BA%E8%B4%A1%E7%8C%AE.html#_%E6%B4%BE%E7%94%9F%E9%A1%B9%E7%9B%AE) |
| 6  | GitKraken Desktop |                                                                                           GitKraken 桌面版                                                                                           |                                                                       GitKraken 客户端                                                                       |
| 7  |       Graph       |                                                                                                 图                                                                                                 |                                                                           图形、图表                                                                           |
| 8  |   Pull Request    |            [拉取请求](https://git-scm.com/book/zh/v2/GitHub-%E5%AF%B9%E9%A1%B9%E7%9B%AE%E5%81%9A%E5%87%BA%E8%B4%A1%E7%8C%AE.html#_%E5%88%9B%E5%BB%BA%E6%8B%89%E5%8F%96%E8%AF%B7%E6%B1%82)             |                                                                           合并请求                                                                            |
| 9  |      Rebase       |                                                          [变基](https://git-scm.com/book/zh/v2/Git-%E5%88%86%E6%94%AF-%E5%8F%98%E5%9F%BA)                                                           |                                                                         ~~重新基于~~                                                                          |
| 10 |       Repo        | [仓库](https://git-scm.com/book/zh/v2/%E5%88%86%E5%B8%83%E5%BC%8F-Git-%E5%88%86%E5%B8%83%E5%BC%8F%E5%B7%A5%E4%BD%9C%E6%B5%81%E7%A8%8B.html#_%E9%9B%86%E4%B8%AD%E5%BC%8F%E5%B7%A5%E4%BD%9C%E6%B5%81) |                                                                         代码库、存储库、库                                                                         |
| 11 |       Solo        |                                                                                               单独显示                                                                                                |                                                                        单独、独立、独立展示                                                                         |
| 12 |       Stage       |                                             [暂存](https://git-scm.com/book/zh/v2/Git-%E5%B7%A5%E5%85%B7-%E4%BA%A4%E4%BA%92%E5%BC%8F%E6%9A%82%E5%AD%98)                                             |                                                                                                                                                           |
| 13 |       Stash       |                                             [贮藏](https://git-scm.com/book/zh/v2/Git-%E5%B7%A5%E5%85%B7-%E8%B4%AE%E8%97%8F%E4%B8%8E%E6%B8%85%E7%90%86)                                             |                                                         储藏、~~隐藏的更改~~、~~藏匿~~、~~存放~~、~~隐藏~~、~~暂存~~                                                          |

#### 保留，不作翻译：

| 序号 |   专有名词    |             注解              |
|:--:|:---------:|:---------------------------:|
| 1  | Launchpad |      GitKraken 的专注视图模式      |
| 2  |    WIP    | Work In Progress - 正在进行中的工作 |
| 3  |  Gitflow  |  一种基于 Git 的工作流程（workflow）   |

> 对应的代码部分在 `comparator.html` 的 `data()` 下，可以通过搜索 `固定翻译词汇` 或者 `fixedTranslations` 找到。