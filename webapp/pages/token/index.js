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
import { DAIIcon } from "../../common/icons/dai-icon";
import { TokenActionBar } from "../../modules/token";
import RickdiculusStreams from "../../abi/RickdiculusStreams.json";
import IERC721 from "../../abi/IERC721.json";
import IERC20 from "../../abi/IERC20.json";
import IVariableDebtToken from ".././../abi/IVariableDebtToken.json";
import { loadAgreements } from "../../utils/client";

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
      const _loanAgreement = await state.ricksContract.LoanAgreements(
        ricksAddress
      );
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

  console.log("nft: ", nft);

  useEffect(() => {
    const loadNFT = async (_loanAgreement) => {
      try {
        let borrower = ethers.utils.getAddress(_loanAgreement.borrower);
        let delegator = ethers.utils.getAddress(_loanAgreement.delegator);
        let tokenAddress = ethers.utils.getAddress(_loanAgreement.tokenAddress);
        let ricksAddress = ethers.utils.getAddress(_loanAgreement.ricksAddress);
        const nftContract = new ethers.Contract(
          tokenAddress,
          IERC721.abi,
          state.signer
        );
        const erc20Contract = new ethers.Contract(
          ricksAddress,
          IERC20.abi,
          state.signer
        );
        const tokenUri = await nftContract.tokenURI(_loanAgreement.tokenId);
        const totalSupply = await erc20Contract.totalSupply();
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
          symbol,
          agreementState: _loanAgreement.agreementState,
          totalSupply: ethers.utils.formatUnits(totalSupply, 18),
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

  const onRepay = async (_amount, _ricksAddress) => {
    const erc20Contract = new ethers.Contract(
      process.env.NEXT_PUBLIC_ERC20_TOKEN,
      IERC20.abi,
      state.signer
    );
    let txn = await erc20Contract.approve(
      process.env.NEXT_PUBLIC_RICKS_CONTRACT,
      ethers.BigNumber.from((_amount * 10 ** 18).toString())
    );
    await txn.wait();
    message.success("DAI has been approved!");

    const ricksContract = new ethers.Contract(
      process.env.NEXT_PUBLIC_RICKS_CONTRACT,
      RickdiculusStreams.abi,
      state.signer
    );
    txn = await ricksContract.repay(ethers.utils.getAddress(_ricksAddress));
    await txn.wait();
    message.success("You have repaid your debt!");

    loadAgreements(dispatch);
  };

  const onReconstitute = async (_ricksAddress) => {
    const ricksContract = new ethers.Contract(
      process.env.NEXT_PUBLIC_RICKS_CONTRACT,
      RickdiculusStreams.abi,
      state.signer
    );
    let txn = await ricksContract.reconstitute(
      ethers.utils.getAddress(_ricksAddress)
    );
    await txn.wait();
    message.success("NFT has been reconstituted");

    loadAgreements(dispatch);
  };

  const startStream = () => {};

  const onDelegate = async (_amount, _ricksAddress) => {
    const erc20Contract = new ethers.Contract(
      process.env.NEXT_PUBLIC_ERC20_TOKEN,
      IERC20.abi,
      state.signer
    );
    let txn = await erc20Contract.approve(
      process.env.NEXT_PUBLIC_RICKS_CONTRACT,
      ethers.BigNumber.from((_amount * 10 ** 18).toString())
    );
    await txn.wait();
    message.success("DAI has been approved");

    const debtTokenContract = new ethers.Contract(
      process.env.NEXT_PUBLIC_VARIABLE_DEBT_TOKEN,
      IVariableDebtToken.abi,
      state.signer
    );
    txn = await debtTokenContract.approveDelegation(
      process.env.NEXT_PUBLIC_RICKS_CONTRACT,
      ethers.BigNumber.from((_amount * 10 ** 18).toString())
    );
    await txn.wait();
    message.success("Credit delegation has been approved");

    const ricksContract = new ethers.Contract(
      process.env.NEXT_PUBLIC_RICKS_CONTRACT,
      RickdiculusStreams.abi,
      state.signer
    );
    txn = await ricksContract.delegate(
      ethers.BigNumber.from(_amount.toString()),
      ethers.utils.getAddress(_ricksAddress)
    );
    await txn.wait();
    message.success("DAI has been deposited to AAVE pool!");

    loadAgreements(dispatch);
  };

  const onWithdraw = () => {};
  const onNoAccount = () => {};

  // Data needed for the status
  const status = useMemo(() => {
    if (loanAgreement) {
      switch (loanAgreement.agreementState) {
        case 0:
          return ["success", "Open"];
        case 1:
          return ["warning", "Inactive"];
        case 2:
          return ["success", "Active"];
        case 3:
          return ["danger", "Closed"];
      }
    }
    return ["", ""];
  }, [loanAgreement]);

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
                  {nft ? "#" + nft.tokenId + " " + nft.name : undefined}
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
                  href={"/owner?address=" + (nft ? nft.borrower : undefined)}
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
                  <Typography.Text strong={true}>{"Amount"}</Typography.Text>
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
                    component={DAIIcon}
                    style={{ fontSize: "42px", marginRight: 16 }}
                  />
                  <Typography.Title level={2} style={{ marginBottom: 0 }}>
                    {nft ? Math.ceil(Number(nft.amount)) : "-"}
                  </Typography.Title>

                  {/* <Typography.Text
                    style={{ marginLeft: 24, marginTop: 16, marginBottom: 0 }}
                  >
                    {"/ day"}
                  </Typography.Text> */}
                </div>
              </Card>

              <Card
                title={
                  <Typography.Text strong={true}>
                    {"Total Supply"}
                  </Typography.Text>
                }
                style={{ marginTop: 24 }}
              >
                <div>
                  <Typography.Text>
                    {nft && nft.totalSupply ? nft.totalSupply : "-"}
                  </Typography.Text>
                </div>
              </Card>

              {nft && (
                <TokenActionBar
                  agreement={nft}
                  account={state.address}
                  onRepay={onRepay}
                  onReconstitute={onReconstitute}
                  startStream={startStream}
                  onDelegate={onDelegate}
                  onWithdraw={onWithdraw}
                  onNoAccount={onNoAccount}
                  style={{ marginTop: 24 }}
                />
              )}
            </div>
          </Col>
        </Row>

        <style jsx>{``}</style>
      </ApplicationPage>
    </>
  );
}
