import { Image, Card, Typography } from "antd";
import React, { useState, useMemo, useEffect } from "react";
import Icon from "@ant-design/icons";
import { GasIcon } from "../../../../common/icons/gas-icon";

export const TokenCard = React.memo(function TokenCard({
  rent,
  // onLoadNFT,
  style,
}) {
  const [nft, setNFT] = useState(rent);

  // useEffect(() => {
  // 	const loadNFT = async (_rent) => {
  // 		const nft = await onLoadNFT(_rent.nftScriptHash, _rent.nftTokenId);
  // 		setNFT(nft);
  // 	};

  // 	loadNFT(rent);
  // }, [rent, onLoadNFT]);

	const durationInDays = 3;
	
	console.log("NFT: ", nft);

  return (
    <div style={style}>
      <Card
        hoverable={true}
        loading={!nft}
        cover={<Image src={nft ? nft.tokenUri : undefined} preview={false} />}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <Typography.Text>{nft ? nft.tokenId : ""}</Typography.Text>
              <Typography.Text strong={true}>
                {"#" + (nft ? nft.tokenId : "")}
              </Typography.Text>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "flex-end",
              }}
            >
              <Typography.Text>{"Price"}</Typography.Text>
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Icon component={GasIcon} style={{ marginRight: 8 }} />
                <Typography.Text strong={true}>
                  {rent.amount}
                </Typography.Text>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "flex-end",
              alignItems: "center",
            }}
          >
            <Typography.Text type={"secondary"} style={{ fontSize: "0.8em" }}>
              {durationInDays + " " + (durationInDays > 1 ? "days" : "day")}
            </Typography.Text>
          </div>
        </div>
      </Card>

      <style jsx>{``}</style>
    </div>
  );
});
