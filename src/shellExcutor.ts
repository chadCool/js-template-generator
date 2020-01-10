import {IntentReceiver} from "octopus-end-nodejs";

const {exec} = require('child_process');

const ct = new IntentReceiver("codeOpener");
ct.registerIntentReceiver([{action: "exec/0.1"}], (_, messageRaw) => {
        //TODO 关注认证机制, 避免出现不可恢复的问题
        const message = JSON.parse(messageRaw);
        console.log("data", JSON.stringify(message));
        const {cmd} = message;
        if (cmd.startsWith('del')  || cmd.startsWith('rm')) {
            console.error("暂时不支持危险的命令del rm");
            return;
        }
        exec(`${cmd}`, (err, stdout, stderr) => {
            if (err) {
                console.log(err);
                return;
            }
            console.log(`stdout: ${stdout}`);
            console.error(`stderr: ${stderr}`);
        });
    }
);





