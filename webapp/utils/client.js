/* pages/index.js */
import { ethers, providers } from "ethers";
import axios from "axios";
import Web3Modal from "web3modal";

import SuperFractionalizer from "../../contracts/artifacts/contracts/SuperFractionalizer.sol/SuperFractionalizer.json";
import ERC721 from "../../contracts/artifacts/@openzeppelin/contracts/token/ERC721/ERC721.sol/ERC721.json";

export async function loadAgreements(dispatch) {
  /* create a generic provider and query for unsold market items */
  const API_KEY = "wklV9CwfGnwr-U2zFTEN2CO1FkEPbryP";
  const alchemyProvider = new providers.AlchemyProvider("kovan", API_KEY);
  const contract = new ethers.Contract(
    "0x8704Dd638939dE081ce681c504453E2ed6140499",
    SuperFractionalizer.abi,
    alchemyProvider
  );
  const data = await contract.fetchAllAgreements();
  const nftContract = new ethers.Contract(
    "0xf8fd0eaC2f4d405cAb579A684a1551491cc4234e",
    ERC721.abi,
    alchemyProvider
  );

  /*
   *  map over items returned from smart contract and format
   *  them as well as fetch their token metadata
   */
  const items = await Promise.all(
    data.map(async (i) => {
      const tokenUri = await nftContract.tokenURI(i.tokenId);
      let borrower = ethers.utils.getAddress(i.borrower);
      let delegator = ethers.utils.getAddress(i.delegator);
      let tokenAddress = ethers.utils.getAddress(i.tokenAddress);
      let ricksAddress = ethers.utils.getAddress(i.ricksAddress)
      let item = {
        tokenId: i.tokenId.toString(),
        borrower,
        delegator,
        amount: ethers.utils.formatUnits(i.amount, 18),
        tokenAddress,
        tokenUri,
        ricksAddress,
      };
      return item;
    })
  );

  dispatch({
    type: "SET_AGREEMENTS",
    agreements: items
  });
  
}
// export async function buyNft(nft) {
//   /* needs the user to sign the transaction, so will use Web3Provider and sign it */
//   const web3Modal = new Web3Modal();
//   const connection = await web3Modal.connect();
//   const provider = new ethers.providers.Web3Provider(connection);
//   const signer = provider.getSigner();
//   const contract = new ethers.Contract(
//     marketplaceAddress,
//     NFTMarketplace.abi,
//     signer
//   );

//   /* user will be prompted to pay the asking proces to complete the transaction */
//   const price = ethers.utils.parseUnits(nft.price.toString(), "ether");
//   const transaction = await contract.createMarketSale(nft.tokenId, {
//     value: price,
//   });
//   await transaction.wait();
//   loadNFTs();
// }
