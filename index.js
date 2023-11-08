import * as sdk from "matrix-js-sdk";
import * as fs from "fs";
const DATA = JSON.parse(fs.readFileSync("/home/inferno214221/Programming/Matrix-Discord-Bridge/data.json"));
const BRIDGE = JSON.parse(fs.readFileSync("/home/inferno214221/Programming/Matrix-Discord-Bridge/bridge.json"));

let go = false;

//TODO: Log To Matrix Channel

// mxClient.sendEvent("!QlvEnCpkoPSToaKbuZ:matrix.org", "m.room.message", {
//     body: "test",
//     msgtype: "m.text",
// }, "", (err, res) => {
//     console.log(err);
// });

const mxClient = sdk.createClient({
    baseUrl: "https://matrix.org",
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
    constructor(matrix, discord) {
        this.matrixRoom = matrix;
        this.discordServer = discord.server;
        this.discordChannel = discord.channel;
        this.discord = discord.server + "/" + discord.channel;
        this.initPage();
    }
    async initPage() {
        this.page = await browser.newPage();
        
        await this.page.goto("https://discord.com/login/");
        //Login redirects for a browser that has already done it.
        await this.page.setViewport({width: 1080, height: 800});
        await this.page.waitForSelector("#app-mount > div.appAsidePanelWrapper__714a6 > div.notAppAsidePanel__9d124 > div.app_b1f720 > div > div.layers__1c917.layers_a23c37 > div > div > nav > ul");

        await this.page.goto("https://discord.com/channels/" + this.discord);
    }
    async getDiscordMessages() {
        let messages = await this.page.evaluate(() => {
            let messages = [];
            let element = document.querySelector("#app-mount > div.appAsidePanelWrapper__714a6 > div.notAppAsidePanel__9d124 > div.app_b1f720 > div > div.layers__1c917.layers_a23c37 > div > div > div > div > div.chat__52833 > div.content__1a4fe > div > div.chatContainer__23434 > main > div.messagesWrapper_ea2b0b.group-spacing-16 > div > div > ol").firstElementChild;
            let author;
            let timestamp;
            let message;
            while (element != undefined) {
                if (element.firstElementChild != undefined && element.firstElementChild.firstElementChild != undefined){
                    Array.from(element.firstElementChild.firstElementChild.children).forEach((element) => {
                        Array.from(element.classList).forEach((elementClass) => {
                            switch (elementClass) {
                                case "header__39b23":
                                    // console.log("Header", element);
                                    author = element.firstElementChild.innerText;
                                    timestamp = new Date(element.firstElementChild.nextElementSibling.firstElementChild.dateTime);
                                    break;
                                case "latin24CompactTimeStamp__21614":
                                    // console.log("TimeStamp", element);
                                    timestamp = new Date(element.firstElementChild.dateTime);
                                    break;
                                case "messageContent__21e69":
                                    // console.log("Message", element);
                                    message = element.innerText;
                                    messages.push([author, timestamp, message]);
                                    break;
                                default:
                                    // console.log("None", element);
                                    break;
                            }
                        });
                    });
                };
                element = element.nextElementSibling;
            }
            return messages;
        });
        console.log(messages);
        //TODO: Send them
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
Object.keys(BRIDGE).forEach((key) => {
    let newPage = new ChannelBridge(key, BRIDGE[key]);
    let index = pages.push(newPage) - 1;
    pageIndexByMatrixRoom[newPage.matrixRoom] = index;
    pageIndexByDiscord[newPage.discord] = index;
});

setTimeout(() => pages.forEach((page) => page.getDiscordMessages()), 60000);

mxClient.on("Room.timeline", function (event, room, toStartOfTimeline) {
    if (!go) {
        return;
    }
    if (event.event.unsigned.age < 6000 && event.event.sender != DATA.matrix.userId) {
        pages[pageIndexByMatrixRoom[event.event.room_id]].handleMatrixMessage(event.event);
    }
});