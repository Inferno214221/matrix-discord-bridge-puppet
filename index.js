import * as sdk from "matrix-js-sdk";
import * as fs from "fs";
const DATA = JSON.parse(fs.readFileSync("/home/inferno214221/Programming/Matrix-Discord-Bridge/data.json"));
const BRIDGE = JSON.parse(fs.readFileSync("/home/inferno214221/Programming/Matrix-Discord-Bridge/bridge.json"));

let go = false;

//TODO: Log To Matrix Channel

const mxClient = sdk.createClient({
    baseUrl: DATA.matrix.baseUrl,
    accessToken: DATA.matrix.accessToken,
    userId: DATA.matrix.userId,
});
await mxClient.startClient({ initialSyncLimit: 10 });

mxClient.once("sync", function (state, prevState, res) {
    if (state === "PREPARED") {
        console.log("prepared");
    } else {
        console.log(state);
        process.exit(1);
    }
});

import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({headless: false});
const page = await browser.newPage();

await page.goto("https://discord.com/login/");
await page.setViewport({width: 1080, height: 800});

await page.waitForSelector("#uid_5");
await page.type("#uid_5", DATA.discord.email);
await page.type("#uid_7", DATA.discord.password);

await page.waitForSelector("#app-mount > div.appAsidePanelWrapper__714a6 > div.notAppAsidePanel__9d124 > div.app_b1f720 > div > div > div > div > form > div.centeringWrapper__319b0 > div > div.mainLoginContainer__58502 > div.block__8bc50.marginTop20_d88ee7 > button.marginBottom8_f4aae3.button__47891.button_afdfd9.lookFilled__19298.colorBrand_b2253e.sizeLarge__9049d.fullWidth__7c3e8.grow__4c8a4");
await page.click("#app-mount > div.appAsidePanelWrapper__714a6 > div.notAppAsidePanel__9d124 > div.app_b1f720 > div > div > div > div > form > div.centeringWrapper__319b0 > div > div.mainLoginContainer__58502 > div.block__8bc50.marginTop20_d88ee7 > button.marginBottom8_f4aae3.button__47891.button_afdfd9.lookFilled__19298.colorBrand_b2253e.sizeLarge__9049d.fullWidth__7c3e8.grow__4c8a4");

await page.waitForSelector("#app-mount > div.appAsidePanelWrapper__714a6 > div.notAppAsidePanel__9d124 > div.app_b1f720 > div > div.layers__1c917.layers_a23c37 > div > div > nav > ul");

go = true;//FIXME:

class ChannelBridge {
    constructor(matrix, discordServer, discordChannel, name = null) {
        this.matrixRoom = matrix;
        this.discordServer = discordServer;
        this.discordChannel = discordChannel;
        this.discord = discordServer + "/" + discordChannel;
        this.name = name;
        this.lastDiscordMsg = new Date().getTime();
        this.matrixUsername = mxClient.getProfileInfo(DATA.matrix.userId, "displayname");
    }

    async initPage() {
        this.page = await browser.newPage();
        
        await this.page.goto("https://discord.com/login/");
        //Login redirects for a browser that has already done it.
        await this.page.setViewport({width: 1080, height: 800});
        // await this.page.waitForSelector("#app-mount > div.appAsidePanelWrapper__714a6 > div.notAppAsidePanel__9d124 > div.app_b1f720 > div > div.layers__1c917.layers_a23c37 > div > div > nav > ul");

        await this.page.goto("https://discord.com/channels/" + this.discord);
        // this.page.goto("https://discord.com/channels/" + this.discord);
    }

    async getDiscordMessages() {
        let messages = await this.page.evaluate((lastDiscordMsg) => {
            console.log(lastDiscordMsg);
            let messages = [];
            let element = document.querySelector("#app-mount > div.appAsidePanelWrapper__714a6 > div.notAppAsidePanel__9d124 > div.app_b1f720 > div > div.layers__1c917.layers_a23c37 > div > div > div > div > div.chat__52833 > div.content__1a4fe > div > div.chatContainer__23434 > main > div.messagesWrapper_ea2b0b.group-spacing-16 > div > div > ol").firstElementChild;
            let author;
            let timestamp;
            let message;
            while (element != undefined) {//TODO: Take timestamp and go backwards
                if (element.firstElementChild != undefined && element.firstElementChild.firstElementChild != undefined){
                    Array.from(element.firstElementChild.firstElementChild.children).forEach((element) => {
                        Array.from(element.classList).forEach((elementClass) => {
                            switch (elementClass) {
                                case "header__39b23":
                                    // console.log("Header", element);
                                    author = element.firstElementChild.innerText;
                                    timestamp = element.firstElementChild.nextElementSibling.firstElementChild.dateTime;
                                    break;
                                case "latin24CompactTimeStamp__21614":
                                    // console.log("TimeStamp", element);
                                    timestamp = element.firstElementChild.dateTime;
                                    break;
                                case "messageContent__21e69":
                                    // console.log("Message", element);
                                    message = element.innerText;
                                    if (message == "") return;
                                    messages.push([author, timestamp, message, "m.text"]);
                                    break;
                                default:
                                    // console.log("None", element);
                                    break;
                            }
                        });
                    });
                    if (element.firstElementChild.firstElementChild.nextElementSibling != null) {
                        try {
                            imageUrl = element.firstElementChild.firstElementChild.nextElementSibling.firstElementChild
                            .firstElementChild.firstElementChild.firstElementChild.firstElementChild.firstElementChild
                            .firstElementChild.nextElementSibling.firstElementChild.firstElementChild.src;
                            console.log(imageUrl);
                            messages.push([author, timestamp, imageUrl, "m.image"]);
                        } catch {}
                    }
                };
                element = element.nextElementSibling;
            }
            return messages;
        }, this.lastDiscordMsg);
        messages.sort((a, b) => new Date(a).getTime() - new Date(b).getTime()).forEach(async (message) => {
            if (message[0] == DATA.discord.username) return;
            if (new Date(message[1]).getTime() > this.lastDiscordMsg) {
                if (this.matrixUsername != message[0]) {
                    await mxClient.setDisplayName(message[0]);
                    this.matrixUsername = message[0];
                }
                
                switch (message[3]) {
                    case "m.text":
                        await mxClient.sendEvent(this.matrixRoom, "m.room.message", {
                            msgtype: "m.text",
                            body: message[2]
                        });
                        break;
                    case "m.image":
                        await mxClient.sendImageMessage(this.matrixRoom, message[2]);
                        break
                }
                
                this.lastDiscordMsg = new Date(message[1]).getTime();
            }
        });
    }

    async handleMatrixMessage(message) {
        console.log(message);
        if (message.type == "m.room.message") {
            await this.page.waitForSelector("#app-mount > div.appAsidePanelWrapper__714a6 > div.notAppAsidePanel__9d124 > div.app_b1f720 > div > div.layers__1c917.layers_a23c37 > div > div > div > div > div.chat__52833 > div.content__1a4fe > div > div.chatContainer__23434 > main > form > div > div.scrollableContainer__33e06.themedBackground__6b1b6.webkit__8d35a > div > div.textArea__74543.textAreaSlate_e0e383.slateContainer_b692b3 > div > div.markup_a7e664.editor__66464.slateTextArea__0661c.fontSize16Padding__48818");
            await this.page.type("#app-mount > div.appAsidePanelWrapper__714a6 > div.notAppAsidePanel__9d124 > div.app_b1f720 > div > div.layers__1c917.layers_a23c37 > div > div > div > div > div.chat__52833 > div.content__1a4fe > div > div.chatContainer__23434 > main > form > div > div.scrollableContainer__33e06.themedBackground__6b1b6.webkit__8d35a > div > div.textArea__74543.textAreaSlate_e0e383.slateContainer_b692b3 > div > div.markup_a7e664.editor__66464.slateTextArea__0661c.fontSize16Padding__48818",
                message.content.body);
            await this.page.keyboard.press("Enter");
        }
    }
}

var pages = [];
var pageIndexByMatrixRoom = {};
var pageIndexByDiscord = {};

console.log("Making Pages: ", BRIDGE);
for (let key of Object.keys(BRIDGE)) {
    let newPage = new ChannelBridge(key, BRIDGE[key].server, BRIDGE[key].channel, BRIDGE[key].name);//TODO: Store Timestamps
    await newPage.initPage();
    let index = pages.push(newPage) - 1;
    pageIndexByMatrixRoom[newPage.matrixRoom] = index;
    pageIndexByDiscord[newPage.discord] = index;
}

mxClient.on("Room.timeline", function (event, room, toStartOfTimeline) {
    if (!go) {
        return;
    }
    if ((event.event.unsigned == undefined || event.event.unsigned.age < 6000) && event.event.sender != DATA.matrix.userId) {
        pages[pageIndexByMatrixRoom[event.event.room_id]].handleMatrixMessage(event.event);
    }
});

for (let page of pages) {
    console.log("Waiting for page: " + (page.name || page.discordChannel));
    //TODO: Handle 'open in desktop app'
    // try {
    //     await page.page.waitForSelector("#app-mount > div.appAsidePanelWrapper__714a6 > div.notAppAsidePanel__9d124 > div.app_b1f720 > div > div.layers__1c917.layers_a23c37 > div > div > div > div > div.chat__52833 > div.content__1a4fe > div > div.chatContainer__23434 > main > form > div > div.scrollableContainer__33e06.themedBackground__6b1b6.webkit__8d35a > div > div.textArea__74543.textAreaSlate_e0e383.slateContainer_b692b3 > div > div.markup_a7e664.editor__66464.slateTextArea__0661c.fontSize16Padding__48818",
    //         { timeout: 3000 });
    // } catch {}
    await page.page.waitForSelector("#app-mount > div.appAsidePanelWrapper__714a6 > div.notAppAsidePanel__9d124 > div.app_b1f720 > div > div.layers__1c917.layers_a23c37 > div > div > div > div > div.chat__52833 > div.content__1a4fe > div > div.chatContainer__23434 > main > form > div > div.scrollableContainer__33e06.themedBackground__6b1b6.webkit__8d35a > div > div.textArea__74543.textAreaSlate_e0e383.slateContainer_b692b3 > div > div.markup_a7e664.editor__66464.slateTextArea__0661c.fontSize16Padding__48818",
        { timeout: 0 });
}
console.log("All pages loaded.");

// await new Promise(resolve => setTimeout(resolve, 120000));
while (true) {
    pages.forEach((page) => page.getDiscordMessages());
    await new Promise(resolve => setTimeout(resolve, 3000));
}