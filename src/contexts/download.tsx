import React, { createContext, useContext, useCallback, useState, useMemo, useEffect, useRef } from 'react'
import { useThrottledCallback } from 'use-debounce'
import { videoFormat } from 'ytdl-core'
import produce from 'immer'
import JsFileDownloader from 'js-file-downloader';

import Video from '../types/Video'
//import { queueDownload, DownloadController } from '../utils/downloader'
import DownloadAbortError from '../errors/DownloadAbortError'
import {BackendContext} from "./backend";

export type DownloadStatus = 'starting' | 'downloading' | 'paused' | 'stopped' | 'finished' | 'failed' | 'queue' | 'processing'

export type DownloadProgress = {
  status: DownloadStatus
  error?: string
  percent: number
  downloaded: number
  total: number
  time: number
  timeLeft: number
  downloadUrl?: string
  downloadFilename?: string
}

export type DownloadFunction = (video: Video, format: videoFormat, splitTracks?: boolean, cut?: Cut) => Promise<void>;
export type Download = {
  video: Video
  format: videoFormat
  progress: DownloadProgress
  splitTracks?: boolean,
}

export type Downloads = Record<string, Download>
//export type Controllers = Record<string, DownloadController>
export type Controllers = Record<string, any>

export interface DownloaderData {
  downloads: Downloads
  download: DownloadFunction
  pause: (video: Video) => void
  resume: (video: Video) => void
  stop: (video: Video) => void
}

type Cut = {
  from: number,
  to: number,
}

const DownloaderContext = createContext<DownloaderData>({} as DownloaderData)

export const DownloaderProvider: React.FC = ({ children }) => {
  const [downloads, setDownloads] = useState<Downloads>({})
  const controllers = useRef<Controllers>({})

  const backend = useContext(BackendContext);

  const updateDownloads = useThrottledCallback((updateFunc: (draft: Downloads) => void) => {
    setDownloads(produce(updateFunc))
  }, 300, { leading: true, trailing: true })

  const download: DownloadFunction = useCallback(async (video, format, splitTracks, cut) => {
    if (!video.id) {
      throw new Error('Invalid video id')
    }

    /*const controller = new DownloadController()
    controllers.current[video.id!] = controller*/

    const progressCallback = (progress: DownloadProgress) => {
      updateDownloads(draft => {
        draft[video.id!] = {
          video,
          format,
          progress,
          splitTracks
        }
      })

      if (progress.status !== 'downloading') {
        updateDownloads.flush()
      }
    }

    try {

      backend.socket.removeAllListeners('progress');
      backend.socket.on('progress', (v: DownloadProgress)=>{
        //console.log(211, v);
        progressCallback(v);
        if("finished" === v.status){
          console.log(v);
          if(v.downloadUrl){
            new JsFileDownloader({
              url: v.downloadUrl
            }).then(() => {
              console.log('downloaded', v.downloadUrl)
              backend.socket.emit('clearDownload', v.downloadFilename);
            });
          }
          clearDownload(video.id!, 4000);
        }
      });

      backend.socket.emit('queueDownload',{
        video,
        format,
        splitTracks,
        progressCallback,
        audioOnly: !format.hasVideo,
        cut
      });

      /*await queueDownload({
        video,
        format,
        controller,
        splitTracks,
        progressCallback,
        audioOnly: !format.hasVideo
      })*/
    } catch (err) {
      if (err instanceof DownloadAbortError) {
        clearDownload(video.id!, 0)
      } else {
        throw err
      }
    } finally {
      clearDownload(video.id!, 4000)
    }
  }, [setDownloads])

  const pause = useCallback((video: Video) => {
    controllers.current[video.id!]?.pause()
  }, [])

  const resume = useCallback((video: Video) => {
    controllers.current[video.id!]?.resume()
  }, [])

  const stop = useCallback((video: Video) => {
    controllers.current[video.id!]?.stop()
  }, [])

  function clearDownload(videoId: string, timeout: number) {
    setTimeout(() => {
      updateDownloads(draft => {
        delete draft[videoId]
      })
      updateDownloads.flush()
      delete controllers.current[videoId]
    }, timeout)
  }

  return (
    <DownloaderContext.Provider value={{
      download,
      downloads,
      pause,
      resume,
      stop
    }}>
      {children}
    </DownloaderContext.Provider>
  )
}

export function useDownloaderData(): DownloaderData {
  const context = useContext(DownloaderContext)
  return context
}

export function useDownloader(): Omit<DownloaderData, 'downloads'> {
  const { download, pause, resume, stop } = useContext(DownloaderContext)
  const downloader = useMemo(() => ({ download, pause, resume, stop }), [download, pause, resume, stop])
  return downloader
}

export type DownloadInfo = Download | undefined

export function useDownloadInfo(videoId: string): DownloadInfo {
  const context = useContext(DownloaderContext)
  const [downloadInfo, setDownloadInfo] = useState<DownloadInfo>()
  useEffect(() => {
    const downloadInfoById = context.downloads[videoId]
    if (JSON.stringify(downloadInfo) !== JSON.stringify(downloadInfoById)) {
      setDownloadInfo(downloadInfoById)
    }
  }, [videoId, downloadInfo, context.downloads])
  return downloadInfo
}

export function useDownloadStatus(videoId: string): DownloadStatus | null {
  const { downloads } = useContext(DownloaderContext)
  const status = useRef<DownloadStatus | null>(null)

  let newStatus: DownloadStatus | null = null
  const download = downloads[videoId]

  if (download) {
    newStatus = download.progress.status
  }

  if (newStatus !== status.current) {
    status.current = newStatus
  }

  return status.current
}

export function useDownloadOptions(videoId: string): Omit<Download, 'video' | 'progress'> | null {
  const { downloads } = useContext(DownloaderContext)
  const options = useRef<Omit<Download, 'video' | 'progress'> | null>(null)

  let newOptions: Omit<Download, 'video' | 'progress'> | null = null
  const download = downloads[videoId]

  if (download) {
    newOptions = {
      format: download.format,
      splitTracks: download.splitTracks
    }
  }

  if (newOptions !== options.current) {
    options.current = newOptions
  }

  return options.current
}

export function useDownloadingVideos(): Video[] {
  const context = useContext(DownloaderContext)
  const [downloadingVideos, setDownloadingVideos] = useState<Video[]>([])
  useEffect(() => {
    const newDownloadingVideos =
      Object.values(context.downloads).map(download => download.video)
    if (JSON.stringify(downloadingVideos) !== JSON.stringify(newDownloadingVideos)) {
      setDownloadingVideos(newDownloadingVideos)
    }
  }, [downloadingVideos, context.downloads])
  return downloadingVideos
}
