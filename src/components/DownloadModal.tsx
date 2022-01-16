import React, {useContext, useEffect, useRef, useState} from 'react'
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button,
  Image,
    Input,
  Text,
  Box,
  Icon,
  Flex
} from '@chakra-ui/react'
import { FaDownload } from 'react-icons/fa'
import { videoFormat } from 'ytdl-core'

import Video from '../types/Video'
import FormatsDropdown from './FormatsDropdown'
import LoadingState from '../types/LoadingState'
import { fetchVideoFormats } from '../utils/formats'
import {
  useDownloader,
  useDownloadStatus,
  useDownloadOptions
} from '../contexts/download'
import Progress from './Progress'
import usePrevious from '../hooks/usePrevious'
import {BackendContext} from "../contexts/backend";
import YouTube from "react-youtube";
import TimeFormat from 'hh-mm-ss';
import InputMask from 'react-input-mask';

interface DownloadModalProps {
  video: Video
  isOpen: boolean
  onClose: () => void
}

// TODO: too much rerendering
const DownloadModal: React.FC<DownloadModalProps> = ({
  video,
  isOpen,
  onClose
}) => {
  const [selected, setSelected] = useState(0)
  const [splitTracks, setSplitTracks] = useState(false)
  const [formats, setFormats] = useState<LoadingState<videoFormat[]>>({
    data: [],
    loading: false
  });

  const [cutFrom, setCutFrom] = useState(0);
  const [cutTo, setCutTo] = useState(0);
  const [player, setPlayer] = useState<any>(null);

  const wasOpened = usePrevious(isOpen)
  const loadingVideo = useRef<string | null>(null)

  const { download, stop } = useDownloader()
  const downloadStatus = useDownloadStatus(video.id!)
  const downloadOptions = useDownloadOptions(video.id!)

  const backend = useContext(BackendContext);

  useEffect(() => {
    const hasOpened = isOpen && !wasOpened
    if (hasOpened) {
      loadFormats()
      if (!downloadOptions) {
        setSplitTracks(false)
        setSelected(0)
      } else {
        fetchVideoFormats(video.id!, backend).then((formats) => {
          const index = formats.indexOf(downloadOptions.format)
          setSplitTracks(!!downloadOptions.splitTracks)
          setSelected(index)
        })
      }
    }
  })

  useEffect(() => {
    const interval = setInterval(() => {
      console.log(player);
      if(player){
        console.log(player.getCurrentTime());
        setCutFrom(Math.floor(player.getCurrentTime()));
      }
    }, 1000);
    return () => clearInterval(interval);

  }, [player]);


  useEffect(() => {
    if(video.duration) {
      setCutTo(Math.floor(video.duration/1000));
    }
  }, [video]);

  useEffect(() => {
    if(player) {
      player.seekTo(cutFrom, true)
    }
    handleCutToChange(cutTo);
  }, [cutFrom]);

  async function loadFormats() {
    setFormats({ data: [], loading: true })
    try {
      loadingVideo.current = video.id!
      const data = await fetchVideoFormats(video.id!, backend)
      if (loadingVideo.current === video.id) {
        setFormats({ data, loading: false })
      }
    } catch (err) {
      console.error(err)
    }
  }

  function handleClose() {
    loadingVideo.current = null
    setFormats({ data: [], loading: false })
    onClose()
  }

  async function handleDownload() {
    try {
      await download(video, formats.data[selected], splitTracks, {from: cutFrom, to: cutFrom+cutTo})
    } catch (err) {
      console.error(err)
    }
  }

  const handleCutFromChange = (v: number) => {

    let nv = Math.min(
        Math.max(0, v),
        Math.floor((video.duration || 0) / 1000)
    );
    console.log(v, nv, cutFrom)
    //handleCutToChange(cutTo, nv);
    setCutFrom(nv);
  }

  const handleCutToChange = (v: number, from?: number) => {
    if(!v) {
      v= 0;
    }
    if(!from){
      from = cutFrom;
    }
    let nv = Math.max(0,
        Math.min(
            Math.floor((video.duration || 0) /1000) - from,
            v
        )
    );
    setCutTo(nv);
    //setCutFrom(Math.min(nv, cutFrom));
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} isCentered size="xl">
      <ModalOverlay />
      <ModalContent background="gray.900" color="gray.100">
        <ModalHeader>
          <Flex direction="row" align="center" justify="flex-start">
            <Icon as={FaDownload} marginRight="3" />
            Download Video
          </Flex>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Box position="relative">
            <YouTube videoId={video.id}
                     opts={{width: '100%'}}
                     onReady={event => {
                       setPlayer(event.target);
                     }}
            />
            <Flex direction="row" align="center" justify="flex-start" style={{marginTop: '8px'}}>

              <InputMask mask="99:99:99"
                         value={TimeFormat.fromS(cutFrom, 'hh:mm:ss')}
                         onChange={(event: any) => {
                           try {
                             handleCutFromChange(TimeFormat.toS(event.target.value.replace(/_/g, '0'), 'hh:mm:ss'))
                           }catch (e){
                             console.log(event.target.value, e)
                           }
                         }}
              >
                {(inputProps: any) => <Input {...inputProps} style={{marginRight:'8px'}} />}
              </InputMask>

               {/* <Input placeholder='From'
                       type={"number"}
                       value={TimeFormat.fromS(cutFrom, 'hh:mm:ss')}
                       onChange={event => {
                         try {
                           handleCutFromChange(TimeFormat.toS(event.target.value, 'hh:mm:ss'))
                         }catch (e){
                           console.log(event.target.value, e)
                         }


                       }}
                       style={{marginRight:'8px'}}
                />*/}
                <Input placeholder='Duration'
                       type={"number"}
                       value={cutTo}
                       onChange={event => handleCutToChange(parseInt(event.target.value))}
                />
            </Flex>
            {/*<Image
              src={video.thumbnailUrl}
              w="100%"
              fit="cover"
              bgColor="gray.300"
              borderRadius="md"
            />*/}

            <Text
              background="blackAlpha.800"
              fontWeight="bold"
              /*position="absolute"*/
              bottom="1"
              right="1"
              fontSize="smaller"
              borderRadius="md"
              paddingX="4px"
              textAlign="center"
            >
              {TimeFormat.fromS(cutFrom, 'hh:mm:ss')} - {TimeFormat.fromS(cutFrom+cutTo, 'hh:mm:ss')}
            </Text>
          </Box>

          <Text
            flex="1"
            isTruncated
            noOfLines={1}
            fontWeight="bold"
            marginTop="2"
            textAlign="center"
          >
            {video.title}
          </Text>

          <Progress videoId={video.id!} marginTop="2" />
        </ModalBody>

        <ModalFooter justifyContent="space-between" flexDirection={'column'}>
          <FormatsDropdown
            formats={formats.data}
            selected={selected}
            setSelected={setSelected}
            splitTracks={splitTracks}
            onSplitTracksChange={setSplitTracks}
            isLoading={formats.loading}
            disabled={formats.loading || downloadStatus !== null}
          />

          <div style={{marginTop: '16px'}}>
            {!downloadStatus || downloadStatus === 'starting' ? (
              <Button
                onClick={handleDownload}
                colorScheme="red"
                mr={3}
                isLoading={downloadStatus === 'starting'}
                disabled={formats.loading || !!downloadStatus}
              >
                Download
              </Button>
            ) : (
              <Button
                onClick={() => stop(video)}
                colorScheme="red"
                mr={3}
                disabled={!['downloading', 'queue'].includes(downloadStatus)}
              >
                Stop
              </Button>
            )}

            <Button
              onClick={onClose}
              variant="ghost"
              _hover={{
                background: 'gray.100',
                color: 'gray.700'
              }}
            >
              Close
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

export default DownloadModal
