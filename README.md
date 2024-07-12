# gitkraken-chinese

GitKraken的中文汉化补丁 - by K-Skye

[说明](#说明) | [更新](#更新) | [原理](#原理) | [操作步骤](#操作步骤) | [issue](#issue)

## 说明

自从用上了GitKraken就爱上了，卸载了其他相关git的GUI，它的界面非常合我的胃口，但是苦于官方没有中文简体，于是便有了汉化的想法。

## 更新

| 日期                    | 更新内容                                                                   | 感谢                                               |
|-----------------------|------------------------------------------------------------------------|--------------------------------------------------|
| 2024.05.20-2024.07.11 | 适配 10.0.0-10.1.0 版本，更新 README.md 的格式                                   | [@YuanXiQWQ](https://github.com/YuanXiQWQ)       |
| 2024.03.07            | 适配 9.13.0 版本                                                           | [@YuanXiQWQ](https://github.com/YuanXiQWQ)       |
| 2024.02.27            | 适配 9.12.0 版本，明晰化 compare.html 的使用说明和操作界面，可视化有道 API 配置，添加关于有道 API 的描述文件 | [@YuanXiQWQ](https://github.com/YuanXiQWQ)       |
| 2024.02.27            | 适配 9.11.1 版本                                                           | [@Jaffrez](https://github.com/Jaffrez)           |
| 2024.02.27            | 适配 9.5.1 版本                                                            | [@buck178](https://github.com/buck178)           |
| 2023.09.11            | 适配 9.5.1 版本                                                            | [@star-andy](https://github.com/star-andy)       |
| 2021.12.17            | 新增可视化对比，接入有道翻译 API                                                     | [@TanxiangCode](https://github.com/TanxiangCode) |
| 2021.03.18            | 新增对比新旧版本区别，自动生成新版本的 JSON 文件的工具 compare.html                            | [@DreamSaddle](https://github.com/DreamSaddle)   |
| 2020.08.18            | 在 Windows 2.7.0 版本 测试通过                                                | [@Black-Spree](https://github.com/Black-Spree)   |
| 2019.10.01            | 在 MacOS 10.14 GitKraken 6.2.0 测试通过                                     | [@yk47g](https://github.com/yk47g)               |

## 原理

通过修改软件目录下 english 语言对应的一个 JSON 文件内容来完成汉化目的。

（自动生成 JSON 工具已实现自动翻译。因有道 API 属于收费接口，故不提供 appKey，有需要者自行申请。）

## 操作步骤

1. 将项目中对应版本的 `.json` 文件重命名为 `strings.json` 并替换 GitKraken 语言目录下的 `strings.json`。  
   (实际目录可能会不一样，但文件名一定是 `strings.json`)

    - Windows: `%程序安装目录%\gitkraken\app-x.x.x\resources\app\src\strings.json` (x.x.x 是你的 GitKraken 版本)
    - Mac: `/Applications/GitKraken.app/Contents/Resources/app/src/strings.json`
    - Linux: `/usr/share/gitkraken/resources/app.asar.unpacked/src` (感谢 [@lyydhy](https://github.com/lyydhy) 补充
      GitKraken 是 deepin 通过 deb 安装的)
    - Linux: `/opt/gitkraken/resources/app.asar.unpacked/src/strings.json` (Arch Linux AUR 安装的路径在这)

2. 重启 GitKraken。

## issue

GitKraken 旧版本目录不一样，应该是以下目录：

- Windows: `%程序安装目录%\gitkraken\app-x.x.x\resources\app.asar.unpacked\src\strings.json` (x.x.x 是你的 GitKraken
  版本)
- Mac: `/Applications/GitKraken.app/Contents/Resources/app.asar.unpacked/src/strings.json`
