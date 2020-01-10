"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const octopus_node_1 = __importDefault(require("octopus-node"));
const octopus_end_nodejs_1 = require("octopus-end-nodejs");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const template = require('art-template');
template.defaults.rules[0].test = /<%(#?)((?:==|=#|[=-])?)[ \t]*([\w\W]*?)[ \t]*(-?)%>/;
template.defaults.rules[1].test = /\$\$([@#]?)[ \t]*(\/?)([\w\W]*?)[ \t]*\$\$/; // /{{([@#]?)[ \t]*(\/?)([\w\W]*?)[ \t]*}}/;
template.defaults.cache = false; // TODO 方便调试模板本身后期关闭
template.defaults.imports.contains = function (list, item) {
    return list.find(item) !== undefined;
};
// require.extensions['.tsx'] = template.extension;
// require.extensions['.ts'] = template.extension;
console.log('[start server]');
octopus_node_1.default();
console.log('[register intent receiver1]');
const ct = new octopus_end_nodejs_1.IntentReceiver("codeTemplate");
// TODO: 如果有多个内容更新过来， 应该分开管理
//TODO 利用ws的path
setTimeout(() => {
    ct.registerIntentReceiver([{ action: "data/xxx" }], (_, messageRaw) => {
        const message = JSON.parse(messageRaw);
        console.log("data", JSON.stringify(message));
        // 通过代码模板生成代码到指定的目录
        // C:\work\helper\antd-template\src
        const { session, template, dataKey, data, targetDir, options } = message;
        switch (template) {
            case "table@chad":
                updateTableCode(session, dataKey, data, targetDir, options);
                break;
        }
    });
}, 1000);
//TODO: 允许设置模板代码的位置
function updateTableCode(session, dataKey, data, targetDir, options) {
    const templatePath = "C:\\work\\helper\\antd-template\\tpl\\table";
    console.log("sessionData old", session, JSON.stringify(loadSession(session)));
    updateSession(session, dataKey, data);
    const sessionData = loadSession(session);
    console.log("sessionData merged:", JSON.stringify(sessionData));
    // 获取目标目录下面的所有的模板文件， 按照规则替换成相应的文件
    fs_1.default.stat(templatePath, function (error, stats) {
        if (error) {
            console.error("读取文件属性失败", error);
            return;
        }
        if (stats.isDirectory()) {
            updateCodeDirFromTemplatePlusData(templatePath, sessionData, targetDir);
        }
        else {
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
    fs_1.default.readdir(templateDir, function (err, files) {
        if (err) {
            console.error(`walk ${templateDir} fail`, err);
            return;
        }
        files.forEach(f => {
            // 只关注.art 文件
            if (f.endsWith(".art")) {
                fs_1.default.stat(path_1.default.join(templateDir, f), function (e, s) {
                    if (e) {
                        console.error("读取文件属性失败", e);
                        return;
                    }
                    if (s.isFile()) {
                        updateCodeFileFromTemplatePlusData(path_1.default.join(templateDir, f), data, path_1.default.join(targetDir, f.substr(0, f.length - 4)));
                    }
                    else {
                        // TODO 是否递归的获取所有的子目录
                    }
                });
            }
        });
    });
}
function updateCodeFileFromTemplatePlusData(templateFilePath, data, targetFilePath) {
    try {
        const view = require(templateFilePath);
        fs_1.default.writeFile(targetFilePath, view(data), error => {
            if (error) {
                console.error(`writeFile fail ${templateFilePath} ${targetFilePath}`, error);
                return;
            }
            // console.log("write file done");
        });
    }
    catch (e) {
        console.error("updateCodeFileFromTemplatePlusData", e);
    }
}
const allData = {};
function loadSession(session) {
    return allData[session];
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
        }
        else {
            sessionData[key] = sessionData[key] || {};
            d = sessionData[key];
        }
    }
    allData[session] = sessionData;
}
