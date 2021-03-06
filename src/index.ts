import startServer from '@octopuses/octopus-node';
import { IntentReceiver } from "@octopuses/octopus-end-nodejs";
import fs from 'fs';
import path from 'path'

const template = require('art-template');
template.defaults.rules[0].test = /<%(#?)((?:==|=#|[=-])?)[ \t]*([\w\W]*?)[ \t]*(-?)%>/;
template.defaults.rules[1].test = /\$\$([@#]?)[ \t]*(\/?)([\w\W]*?)[ \t]*\$\$/; // /{{([@#]?)[ \t]*(\/?)([\w\W]*?)[ \t]*}}/;
template.defaults.cache = false; // TODO 方便调试模板本身后期关闭

template.defaults.imports.contains = function (list: any[], item: any) {
    return list.find(item) !== undefined
};

// require.extensions['.tsx'] = template.extension;
// require.extensions['.ts'] = template.extension;

//TODO: 允许设置模板代码的位置
function updateTableCode(templatePath, session, dataKey, data, targetDir, options) {
    console.log("sessionData old", session, JSON.stringify(loadSession(session)));
    updateSession(session, dataKey, data);
    const sessionData = loadSession(session);
    console.log("sessionData merged:", JSON.stringify(sessionData));

    // 获取目标目录下面的所有的模板文件， 按照规则替换成相应的文件
    fs.stat(templatePath, function (error, stats) {
        if (error) {
            console.error("读取文件属性失败", error);
            return;
        }
        if (stats.isDirectory()) {
            updateCodeDirFromTemplatePlusData(templatePath, sessionData, targetDir);
        } else {
            // TODO
            updateCodeFileFromTemplatePlusData(templatePath, sessionData, targetDir);
        }
    });

    // const view = require('C:\\work\\helper\\antd-template\\tpl\\example.art');
    // const html = view(data);
    // fs.writeFile(path.join(targetDir, "query"), html, (error) => {
    //     if (error) {
    //         console.error("write error", error);
    //     } else {
    //         console.log("write done");
    //     }
    // });
}

function updateCodeDirFromTemplatePlusData(templateDir, data, targetDir) {
    fs.readdir(templateDir, function (err, files) {
        if (err) {
            console.error(`walk ${templateDir} fail`, err);
            return;
        }
        files.forEach(f => {
            // 只关注.art 文件
            if (f.endsWith(".art")) {
                fs.stat(path.join(templateDir, f), function (e, s) {
                    if (e) {
                        console.error("读取文件属性失败", e);
                        return;
                    }
                    if (s.isFile()) {
                        updateCodeFileFromTemplatePlusData(path.join(templateDir, f), data, path.join(targetDir, f.substr(0, f.length - 4)));
                    } else {
                        // TODO 是否递归的获取所有的子目录
                    }
                });
            }
        })
    })
}

function updateCodeFileFromTemplatePlusData(templateFilePath, data, targetFilePath) {
    try {
        const view = require(templateFilePath);
        fs.writeFile(targetFilePath, view(data), error => {
            if (error) {
                console.error(`writeFile fail ${templateFilePath} ${targetFilePath}`, error);
                return;
            }
            // console.log("write file done");
        })
    } catch (e) {
        console.error("updateCodeFileFromTemplatePlusData", e)
    }
}

const allData = {};
function loadSession(session) {
    return allData[session]
}

function updateSession(session, dataKey, data) {
    if (!session) {
        console.error("session empty");
        return;
    }
    if (dataKey === undefined || dataKey === '') {
        // 全部更新
        allData[session] = data;
        return;
    }
    const sessionData = allData[session] || {};
    const keys = dataKey.split('.');
    let d = sessionData || {};
    for (let i = 0; i < keys.length; i += 1) {
        const key = keys[i];
        if (i === keys.length - 1) {
            d[key] = data;
        } else {
            sessionData[key] = sessionData[key] || {};
            d = sessionData[key];
        }
    }
    allData[session] = sessionData;
}

export default function start() {

    console.log('[start server]');
    startServer();

    console.log('[register intent receiver1]');

    const ct = new IntentReceiver("codeTemplate");
    // TODO: 如果有多个内容更新过来， 应该分开管理
    //TODO 利用ws的path
    setTimeout(() => {
        ct.registerIntentReceiver([{ action: "data/xxx" }], (_, messageRaw) => {
            const message = JSON.parse(messageRaw);
            console.log("data", JSON.stringify(message));
            // 通过代码模板生成代码到指定的目录
            // C:\work\helper\antd-template\src
            const { session, template, dataKey, data, targetDir, options, templatePath } = message;
            if (templatePath === undefined) {
                console.error("templdatePath is empty");
                return;
            }
            switch (template) {
                case "table@chad":
                    updateTableCode(path.join(templatePath, 'table'), session, dataKey, data, targetDir, options);
                    break;
            }
        }
        )
    }, 1000
    );
}
