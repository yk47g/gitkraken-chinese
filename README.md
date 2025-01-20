# gitkraken-chinese

GitKraken的中文汉化补丁

[说明](#说明) | [更新](#更新) | [原理](#原理) | [操作步骤](#操作步骤)

## 说明

自从用上了GitKraken就爱上了，卸载了其他相关git的GUI，它的界面非常合我的胃口，但是苦于官方没有中文简体，于是便有了汉化的想法。

## 更新

<details>
<summary>
<strong>更新日志</strong>
</summary>

|          日期           | 更新内容                                                                   |                                                               感谢                                                                |
|:---------------------:|------------------------------------------------------------------------|:-------------------------------------------------------------------------------------------------------------------------------:|
|      2025.01.20       | 根据 10.6.1 版本进行校对&修订，更新 README.md 的格式                                   |                                           [@YuanXiQWQ](https://github.com/YuanXiQWQ)                                            |
| 2024.10.25-2025.01.15 | 适配 10.4.0-10.6.1 版本                                                    |                                           [@YuanXiQWQ](https://github.com/YuanXiQWQ)                                            |
|      2024.09.10       | 接入OpenAI API, 更新优化使用说明和页面交互, 新增文件上传/下载功能                               |                                           [@YuanXiQWQ](https://github.com/YuanXiQWQ)                                            |
|      2024.09.09       | 适配 10.3.0 版本                                                           | [@FXDYJ](https://github.com/FXDYJ) / [@Slinet6056](https://github.com/Slinet6056) /  [@YuanXiQWQ](https://github.com/YuanXiQWQ) |
| 2024.03.07-2024.08.10 | 适配 9.13.0-10.2.0 版本，更新 README.md 的格式，更新文件结构                            |                                           [@YuanXiQWQ](https://github.com/YuanXiQWQ)                                            |
|      2024.02.27       | 适配 9.12.0 版本，明晰化 compare.html 的使用说明和操作界面，可视化有道 API 配置，添加关于有道 API 的描述文件 |                                           [@YuanXiQWQ](https://github.com/YuanXiQWQ)                                            |
|      2024.02.27       | 适配 9.11.1 版本                                                           |                                             [@Jaffrez](https://github.com/Jaffrez)                                              |
|      2024.02.27       | 适配 9.5.1 版本                                                            |                                             [@buck178](https://github.com/buck178)                                              |
|      2023.09.11       | 适配 9.5.1 版本                                                            |                                           [@star-andy](https://github.com/star-andy)                                            |
|      2021.12.17       | 新增可视化对比，接入有道翻译 API                                                     |                                        [@TanxiangCode](https://github.com/TanxiangCode)                                         |
|      2021.03.18       | 新增对比新旧版本区别，自动生成新版本的 JSON 文件的工具 compare.html                            |                                         [@DreamSaddle](https://github.com/DreamSaddle)                                          |
|      2020.08.18       | 在 Windows 2.7.0 版本 测试通过                                                |                                         [@Black-Spree](https://github.com/Black-Spree)                                          |
|      2019.10.01       | 在 macOS 10.14 GitKraken 6.2.0 测试通过                                     |                                               [@yk47g](https://github.com/yk47g)                                                |

</details>

## 原理

通过修改软件目录下 english 语言对应的一个 JSON 文件内容来完成汉化目的。

（自动生成 JSON 工具已实现自动翻译。因有道, OpenAi 的 API 属于收费接口，故不提供 Key，有需要者自行申请，方法详见comparator.html-使用说明。）

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

#### <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Tux.svg/1024px-Tux.svg.png" alt="Linux Icon" style="width: 18px; height: 18px;"> Linux (不同安装方式下路径可能不同)

- (由[@lyydhy](https://github.com/lyydhy)补充) 通过 `deb` 安装（例如 Deepin 系统），路径可能是：

  `/usr/share/gitkraken/resources/app.asar.unpacked/src/strings.json`
- 通过 `AUR` 安装（例如 Arch Linux），路径可能是：

  `/opt/gitkraken/resources/app.asar.unpacked/src/strings.json`

### 2. 重启 GitKraken

完成文件替换后，重启 GitKraken，即可生效。
