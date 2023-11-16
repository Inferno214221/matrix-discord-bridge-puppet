const DATA_FILE_PATH = "/home/inferno214221/Programming/Matrix-Discord-Bridge/data.json";
const BRDIGE_FILE_PATH = "/home/inferno214221/Programming/Matrix-Discord-Bridge/bridge.json";

import * as sdk from "matrix-js-sdk";
import * as fs from "fs";
const DATA = JSON.parse(fs.readFileSync(DATA_FILE_PATH));
var BRIDGE = JSON.parse(fs.readFileSync(BRDIGE_FILE_PATH));

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

const browser = await puppeteer.launch({ headless: false });
const page = await browser.newPage();

await page.goto("https://discord.com/login/");
await page.setViewport({ width: 1080, height: 800 });

await page.waitForSelector("#uid_5");
await page.type("#uid_5", DATA.discord.email);
await page.type("#uid_7", DATA.discord.password);

await page.waitForSelector("#app-mount > div.appAsidePanelWrapper__714a6 > div.notAppAsidePanel__9d124 > div.app_b1f720 > div > div > div > div > form > div.centeringWrapper__319b0 > div > div.mainLoginContainer__58502 > div.block__8bc50.marginTop20_d88ee7 > button.marginBottom8_f4aae3.button__47891.button_afdfd9.lookFilled__19298.colorBrand_b2253e.sizeLarge__9049d.fullWidth__7c3e8.grow__4c8a4");
await page.click("#app-mount > div.appAsidePanelWrapper__714a6 > div.notAppAsidePanel__9d124 > div.app_b1f720 > div > div > div > div > form > div.centeringWrapper__319b0 > div > div.mainLoginContainer__58502 > div.block__8bc50.marginTop20_d88ee7 > button.marginBottom8_f4aae3.button__47891.button_afdfd9.lookFilled__19298.colorBrand_b2253e.sizeLarge__9049d.fullWidth__7c3e8.grow__4c8a4");

await page.waitForSelector("#app-mount > div.appAsidePanelWrapper__714a6 > div.notAppAsidePanel__9d124 > div.app_b1f720 > div > div.layers__1c917.layers_a23c37 > div > div > nav > ul");

go = true;//FIXME:

class ChannelBridge {
    constructor(matrix, discordServer, discordChannel, name, lastMsg) {
        this.matrixRoom = matrix;
        this.discordServer = discordServer;
        this.discordChannel = discordChannel;
        this.discord = discordServer + "/" + discordChannel;
        this.name = name;
        this.lastMsg = lastMsg || new Date().getTime();
        this.matrixUsername = mxClient.getProfileInfo(DATA.matrix.userId, "displayname");
    }

    async initPage() {
        this.page = await browser.newPage();

        await this.page.goto("https://discord.com/login/");
        //Login redirects for a browser that has already done it.
        await this.page.setViewport({ width: 1080, height: 800 });
        // await this.page.waitForSelector("#app-mount > div.appAsidePanelWrapper__714a6 > div.notAppAsidePanel__9d124 > div.app_b1f720 > div > div.layers__1c917.layers_a23c37 > div > div > nav > ul");

        await this.page.goto("https://discord.com/channels/" + this.discord);
        // this.page.goto("https://discord.com/channels/" + this.discord);
    }

    async getDiscordMessages() {
        let messages = await this.page.evaluate((lastMsg) => {
            let messages = [];
            let element = document.querySelector("#app-mount > div.appAsidePanelWrapper__714a6 > div.notAppAsidePanel__9d124 > div.app_b1f720 > div > div.layers__1c917.layers_a23c37 > div > div > div > div > div.chat__52833 > div.content__1a4fe > div > div.chatContainer__23434 > main > div.messagesWrapper_ea2b0b.group-spacing-16 > div > div > ol")
                .lastElementChild;
            let author;
            let timestamp;
            let message;

            let timeFound = false;
            while (element != undefined) {
                if (element.firstElementChild != undefined && element.firstElementChild.firstElementChild != undefined) {
                    Array.from(element.firstElementChild.firstElementChild.children).forEach((element) => {
                        if (timeFound) {
                            return;
                        }
                        Array.from(element.classList).forEach((elementClass) => {
                            if (timeFound) {
                                return;
                            }
                            switch (elementClass.split("__")[0]) {
                                case "header":
                                    // console.log(element.firstElementChild.nextElementSibling.firstElementChild.dateTime);
                                    if (new Date(element.firstElementChild.nextElementSibling.firstElementChild.dateTime).getTime() < lastMsg) {
                                        // console.log("Previous message: " + element.firstElementChild.nextElementSibling.firstElementChild.dateTime);
                                        timeFound = true;
                                    }
                                    break;
                                case "latin24CompactTimeStamp":
                                case "latin12CompactTimeStamp":
                                    // console.log(element.firstElementChild.dateTime);
                                    if (new Date(element.firstElementChild.dateTime).getTime() < lastMsg) {
                                        // console.log("Previous message: " + element.firstElementChild.dateTime);
                                        timeFound = true;
                                    }
                                    break;
                                case "messageContent":
                                    break;
                            }
                        });
                    });
                };
                if (timeFound) {
                    break;
                }
                element = element.previousElementSibling;
            }
            // console.log("Starting From: " + element);

            while (element != undefined) {
                if (element.firstElementChild != undefined && element.firstElementChild.firstElementChild != undefined) {
                    Array.from(element.firstElementChild.firstElementChild.children).forEach((element) => {
                        Array.from(element.classList).forEach((elementClass) => {
                            switch (elementClass.split("__")[0]) {
                                case "header":
                                    // console.log("Header", element);
                                    author = element.firstElementChild.innerText;
                                    timestamp = new Date(element.firstElementChild.nextElementSibling.firstElementChild.dateTime).getTime();
                                    break;
                                case "latin24CompactTimeStamp":
                                case "latin12CompactTimeStamp":
                                    // console.log("TimeStamp", element);
                                    timestamp = new Date(element.firstElementChild.dateTime).getTime();
                                    break;
                                case "messageContent":
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
                        } catch { }
                    }
                };
                element = element.nextElementSibling;
            }
            console.log(messages);
            return messages;
        }, this.lastMsg);
        messages/*.sort((a, b) => new Date(a[1]).getTime() - new Date(b[1]).getTime())*/.forEach(async (message) => {
            console.log(message);
            if (message[0] == DATA.discord.username) return;
            if (new Date(message[1]).getTime() > this.lastMsg) {
                if (this.matrixUsername != message[0] && message[0] != null) {
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

                this.lastMsg = new Date(message[1]).getTime();
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
    let newPage = new ChannelBridge(key, BRIDGE[key].server, BRIDGE[key].channel, BRIDGE[key].name, BRIDGE[key].lastMsg || null);//TODO: Store Timestamps
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
    try {
        await page.page.waitForSelector("#app-mount > div.appAsidePanelWrapper__714a6 > div.notAppAsidePanel__9d124 > div.app_b1f720 > div > div > div > section > div.centeringWrapper__319b0 > button.marginTop8__83d4b.marginCenterHorz__4cf72.linkButton_ba7970.button_afdfd9.lookLink__93965.lowSaturationUnderline__95e71.colorLink_b651e5.sizeMin__94642.grow__4c8a4 > div",
            { timeout: 1000 });
        console.log("Handling 'Open in desktop app'");
        await page.page.click("#app-mount > div.appAsidePanelWrapper__714a6 > div.notAppAsidePanel__9d124 > div.app_b1f720 > div > div > div > section > div.centeringWrapper__319b0 > button.marginTop8__83d4b.marginCenterHorz__4cf72.linkButton_ba7970.button_afdfd9.lookLink__93965.lowSaturationUnderline__95e71.colorLink_b651e5.sizeMin__94642.grow__4c8a4 > div");
        await page.page.waitForSelector("#app-mount > div.appAsidePanelWrapper__714a6 > div.notAppAsidePanel__9d124 > div.app_b1f720 > div > div > div > section > div.centeringWrapper__319b0 > div.list__4e6aa > div > div > div.userActions__8fade > button.button_afdfd9.lookFilled__19298.colorPrimary__6ed40.sizeMedium_c6fa98.grow__4c8a4",
            { timeout: 1000 });
        await page.page.click("#app-mount > div.appAsidePanelWrapper__714a6 > div.notAppAsidePanel__9d124 > div.app_b1f720 > div > div > div > section > div.centeringWrapper__319b0 > div.list__4e6aa > div > div > div.userActions__8fade > button.button_afdfd9.lookFilled__19298.colorPrimary__6ed40.sizeMedium_c6fa98.grow__4c8a4");
    } catch { }
    await page.page.waitForSelector("#app-mount > div.appAsidePanelWrapper__714a6 > div.notAppAsidePanel__9d124 > div.app_b1f720 > div > div.layers__1c917.layers_a23c37 > div > div > div > div > div.chat__52833 > div.content__1a4fe > div > div.chatContainer__23434 > main > form > div > div.scrollableContainer__33e06.themedBackground__6b1b6.webkit__8d35a > div > div.textArea__74543.textAreaSlate_e0e383.slateContainer_b692b3 > div > div.markup_a7e664.editor__66464.slateTextArea__0661c.fontSize16Padding__48818",
        { timeout: 0 });
}
console.log("All pages loaded.");

//TODO: move function to per page so they can start at different times
while (true) {
    pages.forEach((page) => page.getDiscordMessages());
    await new Promise(resolve => setTimeout(resolve, 3000));
    writeToBridgeJSON();
}

function writeToBridgeJSON() {
    pages.forEach((page) => {
        BRIDGE[page.matrixRoom] = {
            name: page.name,
            server: page.discordServer,
            channel: page.discordChannel,
            lastMsg: page.lastMsg
        }
    });
    fs.writeFileSync(BRDIGE_FILE_PATH, JSON.stringify(BRIDGE, null, 4));
}