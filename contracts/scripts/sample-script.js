// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const SuperFractionalizer = await hre.ethers.getContractFactory(
    "SuperFractionalizer"
  );
  const superFractionalizer = await SuperFractionalizer.deploy(
    "0xF5F666AC8F581bAef8dC36C7C8828303Bd4F8561"
  );

  await superFractionalizer.deployed();

  console.log("SuperFractionalizer deployed to:", superFractionalizer.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
