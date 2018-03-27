
## assumption

1. there is at least one stable version on disk
2. beta (& latest) is newer than latest stable. If no, it cannot be used.


## Function Requiremets
1. 获取github release的软件更新，包括自动和手动
2. 自动下载最新的软件更新（tarball）
    1. repack tarball, inject github release object.
3. 安装release，客户端触发；
4. 启动和停止appifi，客户端触发；
5. 提供appifi工作状态，基于与appifi的通讯协议；
6. 打包和项目发布流程
7. TBD 启动逻辑

8. Chassis Owner 发放操作授权，包括api和ipc；
        1. add passport/authentication；
        2. hijack or service hardware button；
        3. or OS user/password;

## Features
1. 可选支持beta版release
2. （未来）支持安装依赖性和node.js

## Constraints
1. 启动/停止appifi和安装release为互斥操作（concurrency = 1）
2. 此项目发布为自动和强制升级，用户无法回卷，要求软件高质量；

## 文件系统使用，文件名约定


----


1. releases [] // include beta release, downloading beta release
2. file system / tarball (stable + beta)
3. appifi (stable or beta)

beta on
1. release download may be influenced. time consuming
2. file system (not affected)
3. appifi (not affected) // user action -> appInstall latest release

beta off
1. abort active beta release download if applicable
2. file system (no need to remove beta tarball)
3. (concurrently) appInstall latest stable release (downgrade)
	
	

at least one stable, zero or more beta

## 启动逻辑


## 部署

1. nexe打包
2. 