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
  const [loanAgreement, setAgreement] = useState(null);
  const [nft, setNFT] = useState(null);

  const onLoadAgreement = useCallback(async (ricksAddress) => {
    try {
      const _loanAgreement = await state.ricksContract.LoanAgreements(ricksAddress);
      setAgreement(_loanAgreement);
    } catch (error) {
      message.error("An error occurred loading loanAgreement from token id.");
    }
  }, []);

  useEffect(() => {
    if (ricksAddress !== undefined) {
      onLoadAgreement(ricksAddress);
    }
  }, [ricksAddress, onLoadAgreement]);

  useEffect(() => {
    const loadNFT = async (_loanAgreement) => {
      try {
        let borrower = ethers.utils.getAddress(_loanAgreement.borrower);
        let delegator = ethers.utils.getAddress(_loanAgreement.delegator);
        let tokenAddress = ethers.utils.getAddress(
          _loanAgreement.tokenAddress
        );
        let ricksAddress = ethers.utils.getAddress(
          _loanAgreement.ricksAddress
        );
        const nftContract = new ethers.Contract(
          tokenAddress,
          ERC721.abi,
          state.signer
        );
        const tokenUri = await nftContract.tokenURI(_loanAgreement.tokenId);
        const name = await nftContract.name();
        const symbol = await nftContract.symbol();
        let item = {
          tokenId: _loanAgreement.tokenId.toString(),
          borrower,
          delegator,
          amount: ethers.utils.formatUnits(_loanAgreement.amount, 18),
          tokenAddress,
          tokenUri,
          ricksAddress,
          name,
          symbol
        };
        setNFT(item);
      } catch (error) {
        message.error("An error occurred loading nft data.");
      }
    };

    if (loanAgreement) {
      loadNFT(loanAgreement);
    }
  }, [loanAgreement]);

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
                    ? "#" + nft.tokenId + " " + nft.name
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
                    (nft ? nft.borrower : undefined)
                  }
                >
                  <a className={"g-link-no-border"}>
                    <Typography.Text>
                      {nft ? nft.borrower : undefined}
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
                    {nft
                      ? Math.ceil(Number(nft.amount))
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

              {/* {loanAgreement && (
                <TokenActionBar
                  rent={loanAgreement}
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
