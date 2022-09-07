import * as fs from "fs";
import * as path from "path";
import { parse } from "csv-parse";
import { BigNumber, ethers } from "ethers";
type Holder = {
  HolderAddress: string;
  Balance: string;
  PendingBalanceUpdate: string;
};

const erc20abi = require("../../helpers/abi-erc20.json");

(async () => {
  const csvFilePath = path.resolve(__dirname, "holders.csv");
  const headers = ["HolderAddress", "Balance", "PendingBalanceUpdate"];
  const fileContent = fs.readFileSync(csvFilePath, { encoding: "utf-8" });

  const provider = new ethers.providers.JsonRpcProvider(
    "https://bsc-dataseed1.binance.org/"
  );

  const contract = new ethers.Contract(
    "0xCfE058c0646c0Eec7e042744D9B8787d0f047a34",
    [
      ...erc20abi,
      "function userBalanceInternal(address _addr) external view returns (uint256, uint256)",
    ],
    provider
  );

  const mappings = {
    update: <{ [key: string]: number }>{
      "0xb80267ea7fa368374ee4d4bf10044778232adefe": 201123,
      "0x0883bdab975463f11f8c53d2bcd05f89478c92b4": 0,
      "0x573b9b32e7c32e0a9e65cf90efd7bfa5ed847e2c": 0,
      "0x400585d9a71edd24f4a6278bcd9c93c2e503b2e3": 0,
      "0x65a8849ab2c48d7a8e825a5cbad707527a55c57f": 0,
    },
    add: <{ [key: string]: number }>{
      "0xbd7f1dc9afb60c4c85a1aba3a3ea4df945090687": 100000,
      "0xab58945dcf54154c82ad2519b32ee4e7f1b73fb8": 100000,
      "0xf013574bbc5f3f578b7b7ec79f30cd8c283d8fd7": 100000,
      "0x5b27bf64f29caea751b94bd2e21cbd01bd2aaf4e": 100000,
      "0x218b499b874bcff85e935aa664e412c792cadfeb": 100000,
      "0x0e93451a2e01f9ce64f646c4c7477a2415fd5613": 100000,
      "0xcbbe4dd7b1487d6c7f8cd150ea76ad3fb9126f21": 100000,
      "0x2b76c4931f7ab8a1b4b45e4440b5852ef15abf10": 100000,
      "0x8db6a4de30abd4b89bf60200a35be4b175ab604c": 100000,
    },
    exclude: [
      "0x0000000000000000000000000000000000000000",
      "0x000000000000000000000000000000000000dead",
      "0xcfe058c0646c0eec7e042744d9b8787d0f047a34",
    ],
    skipZero: true,
  };

  parse(
    fileContent,
    {
      delimiter: ",",
      columns: headers,
    },
    async (error, holders: Holder[]) => {
      if (error) {
        console.error(error);
      }

      let updateHolders: {
        address: string;
        balance: number;
        balanceSummary: number;
      }[] = [];
      let balanceSummary = 0;
      holders.shift();
      for (let i in holders) {
        const address = holders[i].HolderAddress;

        if (mappings.exclude.indexOf(address) >= 0) {
          continue;
        }

        let balance = parseInt(
          ethers.utils.formatUnits(
            (await contract.balanceOf(address)) as BigNumber,
            9
          )
        );

        if (mappings.update[address] >= 0) {
          balance = mappings.update[address];
        }

        if (mappings.add[address] && mappings.add[address] > 0) {
          balance += mappings.add[address];
          delete mappings.add[address];
        }

        if (mappings.skipZero && balance === 0) {
          continue;
        }

        balanceSummary += balance;
        console.log({ address, balance, balanceSummary });
        updateHolders.push({ address, balance, balanceSummary });
      }

      for (let address in mappings.add) {
        const balance = mappings.add[address];
        balanceSummary += balance;
        console.log({ address, balance, balanceSummary });
        updateHolders.push({ address, balance, balanceSummary });
      }

      fs.writeFileSync(
        `${__dirname}/holders.json`,
        JSON.stringify(updateHolders)
      );
    }
  );
})();
