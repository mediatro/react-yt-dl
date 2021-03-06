import React, {createContext} from "react";
import Video from "youtube-sr/dist/Structures/Video";
import ytdl, { chooseFormat, filterFormats, videoFormat } from 'ytdl-core'
import {io, Socket} from "socket.io-client";
import JsFileDownloader from "js-file-downloader";


const apiUrl = process.env.REACT_APP_BACKEND_URL || '';

export class BackendService {

    socket: Socket = io(apiUrl);

    search(q: string): Promise<Video[]> {
        return fetch(`${apiUrl}/search?q=${q}`).then(value => value.json());
    }

    info(v: string): Promise<ytdl.videoInfo> {
        return fetch(`${apiUrl}/info?v=${v}`).then(value => value.json());
    }

    download(filename: string){
        return new JsFileDownloader({
            filename: filename,
            url: `${apiUrl}/download/?filename=${encodeURIComponent(filename)}`
        }).then(() => {
            console.log('downloaded', filename);
            //backend.socket.emit('clearDownload', v.downloadFilename);
        });
    }

}

const defaultContext = new BackendService();

export const BackendContext = createContext<BackendService>(defaultContext);

export const BackendContextProvider: React.FC = ({ children }) => {

    return (
        <BackendContext.Provider value={defaultContext}>
            {children}
        </BackendContext.Provider>
    );

}
