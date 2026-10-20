# Pallet action modes — 20 October 2026

The whole-pallet batch and single-pallet item actions share the transactional persistence layer but have different scopes. The batch action moves all items from each selected source to a separate empty destination. The single-pallet move can select items/quantities and append into an occupied destination. Copying creates new receipts while retaining the source; it is not a stock relocation.

The first batch implementation was tested for movement correctness but not for all transitions between the two interfaces. Opening a slot through another entry point could retain active batch selection and its form. `openSlotEdit` now resets the shared batch mode before opening details. Entering batch mode already closes the item editor, move form and copy form. Copy and item move close each other in both directions.

Button labels now name their scopes: `ย้ายทั้งพาเลทที่เลือก`, `ย้าย / แบ่งสินค้าจากพาเลทนี้`, and `คัดลอกสินค้าเป็นรายการรับใหม่`. An adjacent explanation describes copying's new receipt and how to enter batch mode. No inventory policy or quantity calculation changed.

The combined browser test now exercises item move → copy → item move, item editor → batch mode, and an externally opened slot while the batch destination form is open. It verifies hidden forms, cleared selection and zero unintended writes, alongside existing movement/conflict/account-change checks. Tests use synthetic data only.
