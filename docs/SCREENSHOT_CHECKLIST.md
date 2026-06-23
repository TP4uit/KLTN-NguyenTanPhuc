# Screenshot Checklist

Use this checklist while capturing thesis/demo screenshots. Each caption is intentionally short and thesis-friendly. The app state should be local demo state only; do not show identity secrets, raw proofs, raw nullifiers, vote choices after submission, transaction hashes, wallet addresses, private keys, or private wallet data.

| Screenshot | Route | Account role | Expected state | Vietnamese caption |
| --- | --- | --- | --- | --- |
| Login with demo accounts | `/login` | Guest | Login form visible with demo account options. | "Màn hình đăng nhập cho các vai trò demo." |
| Register voter account | `/register` | Guest | Local voter registration form visible. | "Tạo tài khoản cử tri demo trong trình duyệt." |
| Account and role state | `/account` | Voter, admin, or auditor | Signed-in account details and role badge visible. | "Thông tin tài khoản và vai trò trong phiên demo." |
| Voter registration panel | `/dashboard` | Voter | Registration panel shows not registered, pending, approved, or rejected state. | "Cử tri gửi đăng ký định danh cục bộ cho cuộc bầu cử." |
| Admin registration review | `/admin` | Admin | Pending/approved/rejected registrations visible with review actions. | "Quản trị viên xét duyệt đăng ký cử tri demo." |
| Registry Preview | `/admin` | Admin | Poseidon registry preview shows compatible and incompatible leaves. | "Xem trước cây Poseidon từ các cam kết đã được duyệt." |
| Dynamic Proof Input Preview | `/admin` | Admin | Dynamic proof input/path preview shows readiness or blocking reason. | "Xem trước đầu vào chứng minh động cho chế độ Poseidon." |
| Demo Mode Guide | `/admin` | Admin | Static Fixture Mode and Dynamic Poseidon Mode cards visible. | "Chọn chế độ root demo trước khi mở bầu cử." |
| Merkle root alignment | `/admin` | Admin | Root alignment compares contract root, fixture root, and dynamic preview root. | "Đối chiếu Merkle root giữa hợp đồng và các chế độ demo." |
| Set root confirmation | `/admin` | Admin | In-page confirmation for `setMerkleRoot` visible before MetaMask transaction. | "Xác nhận cập nhật Merkle root trước khi gửi giao dịch." |
| Open election readiness | `/admin` | Admin | Open Election readiness and confirmation visible. | "Kiểm tra điều kiện trước khi mở cuộc bầu cử." |
| Dashboard static vote readiness | `/dashboard` | Voter | Static/fixture-compatible submit path visible and gated by lifecycle/root state. | "Sẵn sàng bỏ phiếu theo chế độ Static Fixture." |
| Dashboard dynamic vote readiness | `/dashboard` | Voter | Dynamic Vote Readiness shows Open state, root match, identity material, and session state. | "Sẵn sàng bỏ phiếu động với cây Poseidon." |
| Results with demo mode/root | `/results` | Voter, admin, or auditor | On-chain tallies loaded with demo mode and Merkle root summary. | "Kết quả on-chain kèm chế độ demo và Merkle root." |
| Results audit export | `/results` | Voter, admin, or auditor | Audit Export section shows checks and copy/download actions. | "Xuất JSON kiểm toán kết quả công khai." |
| Public evidence package export | `/results` | Voter, admin, or auditor | Public Evidence Package summary and copy/download actions visible. | "Gói bằng chứng công khai kết hợp kết quả và registry demo." |
| Audit JSON import | `/audit` | Auditor or admin | Raw Results audit JSON validates successfully. | "Kiểm tra JSON kiểm toán kết quả trong trang audit." |
| Evidence package review | `/audit` | Auditor or admin | Evidence Package Review cards are visible. | "Đánh giá gói bằng chứng theo từng nhóm dữ liệu." |
| Audit package verdict | `/audit` | Auditor or admin | Final Auditor Verdict shows valid, warning, or invalid state. | "Kết luận kiểm toán cho gói bằng chứng công khai." |
| Live comparison result | `/audit` | Auditor or admin | Live comparison table shows matched or mismatched current contract reads. | "So sánh gói audit với trạng thái hợp đồng hiện tại." |
| Reset local browser state | `/admin` | Admin | Admin Demo Runbook reset controls and warning are visible. | "Đặt lại trạng thái demo cục bộ trong trình duyệt." |

## Capture Notes

- Prefer captures after deploying with `LOCAL_ELECTION_AUTO_OPEN=false` so admin lifecycle screens are visible.
- Capture Static Fixture Mode and Dynamic Poseidon Mode separately if both flows are discussed in the thesis.
- For evidence package screenshots, show public root/check/warning summaries rather than raw JSON unless the thesis specifically needs a JSON excerpt.
- Keep MetaMask popups out of screenshots when wallet addresses would be visible.

