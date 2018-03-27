## 分支

本项目包含3个分支，其中：

1. `master`分支用于开发；
2. `staging`分支用于测试；
3. `release`分支用于部署；

这三个分支之间彼此独立，不存在merge逻辑；`staging`和`release`分支中均包含较大的二进制文件（nexe打包文件），且每次更新使用force push全部更新。



## nexe

本项目使用nexe打包发布；nexe会根据运行环境中的node版本选择相应的prebuilt下载；目前约定nexe统一使用node.js的8.9.1 LTS版本。



在负责测试和部署的服务器上推荐使用nvm安装node。



## 开发者（主分支）

对开发者，包括客户端开发者，可以使用如下方式安装和启动该服务。


使用git的`--single-branch`参数clone源代码，者可以避免下载含有较大二进制文件的`staging`和`release`分支。

```bash
## clone
git clone https://github.com/wisnuc/wisnuc-bootstrap --branch master --single-branch

## chage directory
cd wisnuc-bootstrap

## install packages
npm i
```


### 启动目标与参数

`--root`参数可以指定下载的根目录，如果不提供默认使用`/wisnuc`，会需要root权限。

`--global-node`参数可以指定程序使用全局的node（或当前shell的）启动appifi；如果不提供会使用如下路径（这是新的系统部署约定）：

```bash
/wisnuc/node/base/bin/node
```



如果使用node命令直接启动可直接提供参数：

```
node index.js --root tmptest --global-node
```



如果使用npm命令启动则需要提供`--`指定参数：

```
npm start -- --root tmptest --global-node
```



### nexe打包

下述命令会生成打包的文件`app`，仅用于测试；

```
npm run build
```



### 代码提交

开发完成的代码应该直接commit和push到github上，不应该切换分支或者merge，否则可能会造成代码损失或者影响用户部署，切记！



## Staging

执行该操作应使用独立clone的代码池，不应该使用开发用代码池。推荐在云服务器上操作。



操作过程如下，运行结束后停在staging分支。

```bash
# clone
git clone https://github.com/wisnuc/wisnuc-bootstrap --branch master --single-branch

# change directory
cd wisnuc-bootstrap

# run script
./stage.sh
```

注意该操作从`master`分支开始。



### 测试

`wisnuc-boostrap-update`程序支持如下参数：



`--staging`，该参数让程序从staging分支上下载。

`--root`，该参数让程序使用`/wisnuc`之外的目录。



## 发布

执行该操作应使用独立clone的代码池，不应该使用开发用代码池。推荐在云服务器上操作。

```
# clone the full repo
git clone https://github.com/wisnuc/wisnuc-bootstrap

# change directory
cd wisnuc-bootstrap

# checkout release branch
git checkout release

# run script
./release.sh
```

注意：该操作和`staging`不同，需要切换到`release`分支上工作。
