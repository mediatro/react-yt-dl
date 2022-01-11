import React from 'react'
import { render } from 'react-dom'
import { Box, ChakraProvider } from '@chakra-ui/react'
//import { Titlebar, Color } from 'custom-electron-titlebar'
import { Scrollbars } from 'react-custom-scrollbars'

import theme from './styles/theme'
import icon from './assets/icon.svg'

import motion from 'framer-motion';

import DownloadWatcher from './components/DownloadWatcher'
import CloseModal from './components/CloseModal'

import { DownloaderProvider } from './contexts/download'
import { VideosProvider } from './contexts/videos'
import { DownloadModalProvider } from './contexts/downloadModal'

import Routes from './screens/Routes'

import 'focus-visible/dist/focus-visible'
import {BackendContextProvider} from "./contexts/backend";

/*new Titlebar({
  backgroundColor: Color.fromHex(theme.colors.gray[800]),
  titleHorizontalAlignment: 'left',
  menu: null,
  icon
})*/

const App = () => {
  return (
    <ChakraProvider theme={theme}>
      <DownloaderProvider>
        <VideosProvider>
          <BackendContextProvider>
            {/*<Routes />*/}
          <CloseModal>
            <DownloadModalProvider>
              <Scrollbars
                id="scroll-container"
                style={{height: '100vh'}}
                renderThumbVertical={(props) => (
                  <Box
                    {...props}
                    opacity="0.7"
                    bgColor="red.500"
                    borderRadius="8px"
                    zIndex="10"
                  />
                )}
                renderView={(props) => (
                  <Box
                    minH="100%"
                    background="gray.900"
                    color="gray.100"
                    overflowX="hidden"
                    {...props}
                  />
                )}
              >
                <Routes />
                <DownloadWatcher />
              </Scrollbars>
            </DownloadModalProvider>
          </CloseModal>
          </BackendContextProvider>
        </VideosProvider>
      </DownloaderProvider>
    </ChakraProvider>
  )
}

export default App;
//render(<App />, document.getElementById('root'))
