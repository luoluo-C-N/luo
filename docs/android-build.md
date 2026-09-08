# Android 0.01 构建与安装

工程：Capacitor 8.5.1，应用ID `cn.kirameku.pocket`，名称“掌上小站”，versionCode 1、versionName 0.0.1（对外称0.01）。Android最低7.0/API24，target/compile SDK36。

## 重现构建

在 `E:/glm/appkf` 的 PowerShell 中：

```powershell
npm ci
./scripts/android-setup.ps1
./scripts/android-build.ps1
```

已有最新 `dist` 时可 `./scripts/android-build.ps1 -SkipWebBuild`。构建脚本先同步真实Web产物，再编译和验证APK签名，输出 `release/kirameku-0.01-debug.apk` 及SHA256文件。脚本任何阶段失败都会停止，不会把旧产物当作本次成功。

工具安装在项目 `tools/`，Gradle缓存 `.gradle-home/`、Android用户目录 `.android-home/`；不修改系统环境变量、不安装全局SDK或Java。下载工具约350MB，加SDK与Gradle依赖应预留数GB。SDK安装脚本接受开发所需Android SDK许可证。已有Java25未使用，因为本模板Gradle8.14.3与源码Java21组合使用隔离Temurin21更可控。

## 下载来源与完整性

- [Capacitor官方8.0迁移说明](https://capacitorjs.com/docs/updating/8-0)：Node22+、SDK36、Gradle8.14.3及AGP8.13.0；本地8.5.1模板已核验相同版本，capacitor/build.gradle源码语言级别21。
- [Android官方工具下载](https://developer.android.com/studio)：commandlinetools-win-15859902_latest.zip，SHA256 `90ae805d20434428bffcb699c290860f19bb5f66a67e6b330067e3de801fb04a`。
- [Eclipse Adoptium官方元数据](https://api.adoptium.net/v3/assets/latest/21/hotspot?architecture=x64&image_type=jdk&os=windows&vendor=eclipse)：本次解析到Temurin21.0.12.1+1 Windows x64，固定下载URL和SHA256写入setup脚本；原始元数据保存在 tools/downloads/jdk-metadata-array.json。SHA256 `f9d6e191ab098c0d416e7d588a24420a8621cd2f4720dab2459b8b7b2d2d8b4e`。

两个归档均已与官方元数据校验通过；SDK组件由官方sdkmanager安装。

## 本地后端连接

APK内置Web资源，没有硬编码外部网站地址；后端地址由应用连接页配置。Capacitor WebView origin为 `http://localhost`，后端CORS须允许该来源。局域网开发允许cleartext和混合内容，目的是连接用户现有HTTP后端；APK禁用系统备份，避免备份管理会话。正式互联网部署应配置HTTPS，并移除HTTP开发兼容配置。

手机填电脑的局域网IP，例如 `http://192.168.x.x:8000`；手机自己的 localhost 指手机，不是电脑。后端需监听局域网并允许防火墙访问。不得用 `server.url` 指向开发服务器，否则APK离开电脑就没有内置页面。

## 安装与验证范围

可把APK复制到Android手机，允许该文件来源安装；或USB调试连接后执行 `tools/android-sdk/platform-tools/adb.exe install -r release/kirameku-0.01-debug.apk`。这是debug签名包，不是商店发行签名；后续正式发布需要用户掌管的发布密钥。

构建成功与签名验证不等同于真机验收。没有连接手机/模拟器时必须另行验证安全区、软键盘、返回键、文件选择、真实局域网连接及后台恢复。iOS编译需要macOS和Xcode，本Windows工程不声称已有IPA。

## 当前证据

原生工程及隔离SDK/JDK已生成，等待应用真实dist后编译。最终APK产物与验证结果将追加于此。
