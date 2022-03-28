import { Image, Card, Typography } from "antd";
import React, { useState, useMemo, useEffect } from "react";
import Icon from "@ant-design/icons";
import { GasIcon } from "../../../../common/icons/gas-icon";

export const TokenCard = React.memo(function TokenCard({
  agreement,
  // onLoadNFT,
  style,
}) {
  const [nft, setNFT] = useState(agreement);

  // useEffect(() => {
  // 	const loadNFT = async (_rent) => {
  // 		const nft = await onLoadNFT(_rent.nftScriptHash, _rent.nftTokenId);
  // 		setNFT(nft);
  // 	};

  // 	loadNFT(agreement);
  // }, [agreement, onLoadNFT]);

	const durationInDays = 3;
	

  return (
    <div style={style}>
      <Card
        hoverable={true}
        loading={!agreement}
        cover={<Image src={agreement ? agreement.tokenUri : undefined} preview={false} />}
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
              <Typography.Text>{agreement ? agreement.tokenId : ""}</Typography.Text>
              <Typography.Text strong={true}>
                {"#" + (agreement ? agreement.tokenId : "")}
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
                  {agreement.amount}
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
