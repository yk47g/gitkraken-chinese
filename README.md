# gitkraken-chinese
GitKraken的中文汉化补丁 - by K-Skye

## 说明
自从用上了GitKraken就爱上了，卸载了其他相关git的gui，它的界面非常合我的胃口，但是苦于官方没有中文简体，于是便有了汉化的想法.  

## 更新

更新于2024.02.27 适配 9.12.0 版本,明晰化compare.html的使用说明和操作界面,可视化有道API配置,添加关于有道API的描述文件（感谢@YuanXiQWQ）  
更新于2023.02.27 适配 9.11.1 版本（感谢@Jaffrez）  
更新于2023.02.27 适配 9.5.1 版本（感谢@buck178）  
更新于2023.09.11 适配 9.5.1 版本（感谢@star-andy）  
更新于2021.12.17 新增可视化对比，接入有道翻译API（感谢@TanxiangCode）  
更新于2021.03.18 新增对比新旧版本区别，自动生成新版本的json文件的工具compare.html（感谢@DreamSaddle）  
更新于2020.08.18 在windows 2.7.0版本 测试通过（感谢@Black-Spree）  
更新于2019.10.01 在MacOS 10.14 GitKraken 6.2.0测试通过  

## 原理

通过修改软件目录下english语言对应的一个json文件内容来完成汉化目的
  
（自动生成json工具已实现自动翻译。因有道API属于收费接口，故不提供appKey，有需要者自行申请。）  
## 操作步骤

1. 将项目中对应版本的.json文件重命名为 `strings.json` 并替换 GitKraken 语言目录下的 `strings.json`.  
(实际目录可能会不一样,但文件名一定是strings.json)
  
   - Windows: `%程序安装目录%\gitkraken\app-x.x.x\resources\app\src\strings.json` (x.x.x 是你的GitKraken版本)
   - Mac: `/Applications/GitKraken.app/Contents/Resources/app/src/strings.json`
   - Linux: `/usr/share/gitkraken/resources/app.asar.unpacked/src` (感谢@lyydhy 10.31补充 Gitkraken是deepin 通过deb 安装的)
   - Linux: `/opt/gitkraken/resources/app.asar.unpacked/src/strings.json` (Arch Linux AUR 安装的路径在这)
     
2. 重启GitKraken.

## issue

GitKraken旧版本目录不一样，应该是以下目录：
   - Windows: `%程序安装目录%\gitkraken\app-x.x.x\resources\app.asar.unpacked\src\strings.json` (x.x.x 是你的GitKraken版本)
   - Mac: `/Applications/GitKraken.app/Contents/Resources/app.asar.unpacked/src/strings.json`
