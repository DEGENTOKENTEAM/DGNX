import * as fs from "fs";
import * as path from "path";
import { parse } from "csv-parse";
type Holder = {
  HolderAddress: string;
  Balance: string;
  PendingBalanceUpdate: string;
};

(() => {
  const csvFilePath = path.resolve(__dirname, "holders.csv");

  const headers = ["HolderAddress", "Balance", "PendingBalanceUpdate"];

  const fileContent = fs.readFileSync(csvFilePath, { encoding: "utf-8" });

  parse(
    fileContent,
    {
      delimiter: ",",
      columns: headers,
    },
    (error, holders: Holder[]) => {
      if (error) {
        console.error(error);
      }

      let rawSummary = 0;
      let updateHolders: { address: string; balance: string }[] = [];
      holders.shift();
      for (let i in holders) {
        const address = holders[i].HolderAddress;

        const rawBalance = Math.trunc(
          parseFloat(holders[i].Balance) * 10 ** 18
        );
        const balance = rawBalance.toLocaleString("fullwide", {
          useGrouping: false,
        });

        updateHolders.push({ address, balance });

        rawSummary += rawBalance;
      }
    }
  );
})();
