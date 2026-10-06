# Copy pallet entries

Open a populated pallet and choose **คัดลอกพาเลต**. Select a destination zone and one or more destination positions (up to 50). Choose products, check the new receipt date/reference and edit the quantity per destination pallet. Confirm to create new receipt entries. The quantity defaults to the source's current balance; missing or nonpositive balances require manual entry.

This records additional received stock, not a stock transfer. The source is unchanged. Existing destination entries are retained. Each copied item receives an independent quantity/balance and a fresh receipt timestamp, the logged-in username and source-pallet provenance. Withdrawal, return and transfer histories are not copied. The form can be cancelled normally without a credential prompt.

The existing `save_pallet_changes` RPC receives all destination proposals in one version-checked batch, with `receive` audit action and receipt reference. Source data is only used as a template and is not submitted as an update. A changed source/selected destination blocks submission; a server conflict or network failure retains the form. No schema or permissions change is needed. Production inventory was not mutated for testing.

Validation: `node tests/slot-copy.test.cjs`; `node tests/slot-copy-browser.cjs`; `PK_COPY_BROWSER=webkit node tests/slot-copy-browser.cjs` (use PowerShell env syntax on Windows). Fixtures test two destinations, an occupied destination, immutable source, fresh histories, independent quantities, invalid amounts/dates, server conflict, actor audit fields and mobile/desktop bounds. Both Edge and WebKit passed at 390 and 1440px; 78 unit tests passed. Mock RPC verification is not an actual production copy transaction.
