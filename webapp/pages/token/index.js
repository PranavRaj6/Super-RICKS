import { message, Row, Col, Image, Card, Typography, Badge, Tag } from "antd";
import { ethers, providers } from "ethers";
import Head from "next/head";
import { useRouter } from "next/router";
import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useContext,
} from "react";
import { GlobalContext } from "../../context/store";
import { ApplicationPage } from "../../application";
import Link from "next/link";
import Icon from "@ant-design/icons";
import { GasIcon } from "../../common/icons/gas-icon";
import { TokenActionBar } from "../../modules/token";
import SuperFractionalizer from "../../../contracts/artifacts/contracts/SuperFractionalizer.sol/SuperFractionalizer.json";
import ERC721 from "../../../contracts/artifacts/@openzeppelin/contracts/token/ERC721/ERC721.sol/ERC721.json";

export default function IndexPage() {
  const [state, dispatch] = useContext(GlobalContext);

  const API_KEY = "wklV9CwfGnwr-U2zFTEN2CO1FkEPbryP";
  const alchemyProvider = new providers.AlchemyProvider("kovan", API_KEY);
  const contract = new ethers.Contract(
    "0x8704Dd638939dE081ce681c504453E2ed6140499",
    SuperFractionalizer.abi,
    alchemyProvider
  );
  const nftContract = new ethers.Contract(
    "0xf8fd0eaC2f4d405cAb579A684a1551491cc4234e",
    ERC721.abi,
    alchemyProvider
  );
  const signer = state.web3Provider.getSigner();
  const router = useRouter();
  // Extract ricksAddress from router query param
  const ricksAddress = useMemo(() => {
    return router.query.id;
  }, [router]);

  // If no token id redirect to 404 page
  useEffect(() => {
    if (router.isReady && ricksAddress === undefined) {
      router.push("/404");
    }
  }, [router, ricksAddress]);

  // Data needed to populate the page
  const [loanAgreements, setAgreement] = useState(null);
  const [nft, setNFT] = useState(null);

  const onLoadAgreement = useCallback(async (ricksAddress) => {
    try {
      const _loanAgreements = await contract.LoanAgreements(ricksAddress);
      console.log("_loanAgreements: ", _loanAgreements);
      setAgreement(_loanAgreements);
    } catch (error) {
      message.error("An error occurred loading loanAgreements from token id.");
    }
  }, []);

  useEffect(() => {
    if (ricksAddress !== undefined) {
      onLoadAgreement(ricksAddress);
    }
  }, [ricksAddress, onLoadAgreement]);

  useEffect(() => {
    const loadNFT = async (_loanAgreements) => {
      try {
        const tokenUri = await nftContract.tokenURI(_loanAgreements.tokenId);
        let borrower = ethers.utils.getAddress(_loanAgreements.borrower);
        let delegator = ethers.utils.getAddress(_loanAgreements.delegator);
        let tokenAddress = ethers.utils.getAddress(
          _loanAgreements.tokenAddress
        );
        let ricksAddress = ethers.utils.getAddress(
          _loanAgreements.ricksAddress
        );
        let item = {
          tokenId: _loanAgreements.tokenId.toString(),
          borrower,
          delegator,
          amount: ethers.utils.formatUnits(_loanAgreements.amount, 18),
          tokenAddress,
          tokenUri,
          ricksAddress,
        };
        setNFT(item);
      } catch (error) {
        message.error("An error occurred loading nft data.");
      }
    };

    if (loanAgreements) {
      loadNFT(loanAgreements);
    }
  }, [loanAgreements]);

  const onCloseToken = () => {};
  const onRevokeToken = () => {};
  const onWithdrawToken = () => {};
  const onRentToken = () => {};
  const onPayToken = () => {};
  const onNoAccount = () => {};

  // Data needed for the status
//   const status = useMemo(() => {
//     if (rent) {
//       switch (rent.state) {
//         case StateType.Open:
//           return ["success", "Open"];
//         case StateType.Rented:
//           return ["warning", "Rented"];
//         case StateType.Closed:
//           return ["danger", "Closed"];
//       }
//     }
//     return ["", ""];
//   }, [rent]);
	const status = ["success", "Open"];

  const durationInDays = 5

  return (
    <>
      <Head>
        <title>rickdiculas</title>
      </Head>

      <ApplicationPage>
        <Row gutter={24}>
          <Col xs={24} sm={24} md={24} lg={10} xl={10}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <Card
                loading={!nft}
                cover={
                  <Image src={nft ? nft.tokenUri : undefined} preview={false} />
                }
              />

              <Card
                title={
                  <Typography.Text strong={true}>
                    {"Description"}
                  </Typography.Text>
                }
                style={{ marginTop: 24 }}
              >
                <div>
                  <Typography.Text>
                    {nft ? nft.tokenUri : undefined}
                  </Typography.Text>
                </div>
              </Card>

              <Card
                title={
                  <Typography.Text strong={true}>{"Status"}</Typography.Text>
                }
                style={{ marginTop: 24, marginBottom: 24 }}
              >
                <div>
                  <Typography.Text type={status[0]}>
                    {status[1]}
                  </Typography.Text>
                </div>
              </Card>
            </div>
          </Col>
          <Col xs={24} sm={24} md={24} lg={14} xl={14}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div>
                <Typography.Text>
                  {nft ? nft.tokenAddress : undefined}
                </Typography.Text>
              </div>

              <div>
                <Typography.Title>
                  {nft
                    ? "#" + nft.ricksAddress + " " + nft.delegator
                    : undefined}
                </Typography.Title>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  flexWrap: "wrap",
                  alignItems: "center",
                  overflow: "hidden",
                }}
              >
                <Typography.Text style={{ marginRight: 8 }}>
                  {"Owned by"}
                </Typography.Text>

                <Link
                  href={
                    "/owner?address=" +
                    (loanAgreements ? loanAgreements.borrower : undefined)
                  }
                >
                  <a className={"g-link-no-border"}>
                    <Typography.Text>
                      {loanAgreements ? loanAgreements.borrower : undefined}
                    </Typography.Text>
                  </a>
                </Link>
              </div>

              <Card
                title={
                  <Typography.Text strong={true}>{"Price"}</Typography.Text>
                }
                style={{ marginTop: 24 }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "flex-start",
                    alignItems: "center",
                  }}
                >
                  <Icon
                    component={GasIcon}
                    style={{ fontSize: "42px", marginRight: 16 }}
                  />
                  <Typography.Title level={2} style={{ marginBottom: 0 }}>
                    {loanAgreements
                      ? Math.ceil(Number(loanAgreements.amount))
                      : "-"}
                  </Typography.Title>

                  <Typography.Text
                    style={{ marginLeft: 24, marginTop: 16, marginBottom: 0 }}
                  >
                    {"/ day"}
                  </Typography.Text>
                </div>
              </Card>

              <Card
                title={
                  <Typography.Text strong={true}>{"Duration"}</Typography.Text>
                }
                style={{ marginTop: 24 }}
              >
                <div>
                  <Typography.Text>
                    {durationInDays +
                      " " +
                      (durationInDays > 1 ? "days" : "day")}
                  </Typography.Text>
                </div>
              </Card>

              {/* {loanAgreements && (
                <TokenActionBar
                  rent={loanAgreements}
                  account={state.address}
                  onCloseToken={onCloseToken}
                  onRevokeToken={onRevokeToken}
                  onWithdrawToken={onWithdrawToken}
                  onRentToken={onRentToken}
                  onPayToken={onPayToken}
                  onNoAccount={onNoAccount}
                  style={{ marginTop: 24 }}
                />
              )} */}
            </div>
          </Col>
        </Row>

        <style jsx>{``}</style>
      </ApplicationPage>
    </>
  );
}
