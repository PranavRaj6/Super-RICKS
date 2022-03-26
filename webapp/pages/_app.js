import "../styles/globals.css";
import "../styles/antd.less";
import Head from "next/head";
import { Application } from "../application";

function MyApp({ Component, pageProps }) {
  return (
    <Application>
      <Head>
        <link rel="shortcut icon" href="favicon/favicon.ico" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&display=swap"
        />

        <meta
          name="description"
          content="Peer to peer renting of Neo N3 NFTs"
        />
      </Head>

      <Component {...pageProps} />
    </Application>
  );
}

export default MyApp;
