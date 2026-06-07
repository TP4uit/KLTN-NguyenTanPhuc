import { expect } from "chai";
import hre from "hardhat"; // Giữ lại dòng này để lấy môi trường thực thi

describe("Hệ thống Bầu cử ZKP (Election Contract)", function () {
  let election: any;
  let verifier: any;
  let owner: any;
  let voter1: any;

  beforeEach(async function () {
    // Ép kiểu lấy ethers ngay BÊN TRONG hàm - lúc này Hardhat đã nạp xong toàn bộ plugin
    const ethers = (hre as any).ethers;

    [owner, voter1] = await ethers.getSigners();

    // 1. Triển khai Verifier Contract
    const Verifier = await ethers.getContractFactory("Groth16Verifier");
    verifier = await Verifier.deploy();

    const verifierAddress = await verifier.getAddress(); 

    // 2. Triển khai Election Contract và truyền địa chỉ Verifier vào
    const Election = await ethers.getContractFactory("Election");
    election = await Election.deploy(verifierAddress);
  });

  it("Nên triển khai thành công và gán đúng quyền Admin", async function () {
    const ethers = (hre as any).ethers;
    expect(await election.admin()).to.equal(owner.address);
  });
  
  it("Nên khởi tạo số phiếu của các ứng viên bằng 0", async function () {
    const votes = await election.getVotes(1);
    expect(votes).to.equal(0n);
  });
});