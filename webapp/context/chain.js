/**
 * Chain Information
 */
const CONTRACT_NAME = process.env.GATSBY_CONTRACT_NAME;

export const chain = {
  networkId: "testnet",
  nodeUrl: "https://rpc.testnet.near.org",
  contractName: CONTRACT_NAME,
  walletUrl: "https://wallet.testnet.near.org",
  helperUrl: "https://helper.testnet.near.org",
  explorerUrl: "https://explorer.testnet.near.org",
};
