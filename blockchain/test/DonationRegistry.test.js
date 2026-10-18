const { expect } = require("chai");
const { ethers } = require("hardhat");

const NGO_ID = "3f1c8a2e-0000-4000-8000-abcdef123456";
const CAUSE = "Clean Water Access";

describe("DonationRegistry", function () {
  let registry, admin, donor, ngo, outsider;

  beforeEach(async function () {
    [admin, donor, ngo, outsider] = await ethers.getSigners();
    registry = await ethers.deployContract("DonationRegistry");
    await registry.waitForDeployment();
  });

  describe("deployment", function () {
    it("sets the deployer as admin and a stage updater", async function () {
      expect(await registry.admin()).to.equal(admin.address);
      expect(await registry.stageUpdaters(admin.address)).to.equal(true);
    });

    it("starts with no donations", async function () {
      expect(await registry.donationCount()).to.equal(0n);
    });
  });

  describe("donate", function () {
    it("forwards the full value to the NGO and keeps no balance", async function () {
      const amount = ethers.parseEther("1.5");
      await expect(
        registry.connect(donor).donate(ngo.address, NGO_ID, CAUSE, { value: amount })
      ).to.changeEtherBalances([donor, ngo, registry], [-amount, amount, 0n]);
    });

    it("stores the donation and emits DonationRecorded", async function () {
      const amount = ethers.parseEther("0.25");
      await expect(
        registry.connect(donor).donate(ngo.address, NGO_ID, CAUSE, { value: amount })
      )
        .to.emit(registry, "DonationRecorded")
        .withArgs(1n, donor.address, ngo.address, amount, NGO_ID, CAUSE, anyUint());

      const d = await registry.getDonation(1);
      expect(d.donor).to.equal(donor.address);
      expect(d.ngoWallet).to.equal(ngo.address);
      expect(d.amount).to.equal(amount);
      expect(d.ngoId).to.equal(NGO_ID);
      expect(d.cause).to.equal(CAUSE);
      expect(d.stage).to.equal(1);
    });

    it("increments ids and indexes them by donor", async function () {
      const v = { value: ethers.parseEther("0.1") };
      await registry.connect(donor).donate(ngo.address, NGO_ID, CAUSE, v);
      await registry.connect(donor).donate(ngo.address, NGO_ID, CAUSE, v);
      expect(await registry.donationCount()).to.equal(2n);
      expect(await registry.getDonationIdsByDonor(donor.address)).to.deep.equal([1n, 2n]);
    });

    it("rejects a zero-value donation", async function () {
      await expect(
        registry.connect(donor).donate(ngo.address, NGO_ID, CAUSE, { value: 0 })
      ).to.be.revertedWithCustomError(registry, "ZeroAmount");
    });

    it("rejects the zero address as an NGO wallet", async function () {
      await expect(
        registry
          .connect(donor)
          .donate(ethers.ZeroAddress, NGO_ID, CAUSE, { value: ethers.parseEther("0.1") })
      ).to.be.revertedWithCustomError(registry, "InvalidNgoWallet");
    });

    it("reverts the whole tx if the NGO wallet rejects the transfer", async function () {
      // A contract with no receive/fallback cannot accept POL.
      const rejecting = await ethers.deployContract("DonationRegistry");
      await rejecting.waitForDeployment();
      await expect(
        registry
          .connect(donor)
          .donate(await rejecting.getAddress(), NGO_ID, CAUSE, { value: ethers.parseEther("0.1") })
      ).to.be.revertedWithCustomError(registry, "TransferFailed");
      // Nothing was recorded, because the revert rolled the state back.
      expect(await registry.donationCount()).to.equal(0n);
    });
  });

  describe("recordStage", function () {
    beforeEach(async function () {
      await registry
        .connect(donor)
        .donate(ngo.address, NGO_ID, CAUSE, { value: ethers.parseEther("0.1") });
    });

    it("lets an authorised updater advance the stage", async function () {
      const proof = ethers.keccak256(ethers.toUtf8Bytes("receipt.pdf"));
      await expect(registry.recordStage(1, 2, proof))
        .to.emit(registry, "StageRecorded")
        .withArgs(1n, 2, proof, admin.address, anyUint());
      expect((await registry.getDonation(1)).stage).to.equal(2);
    });

    it("blocks an unauthorised caller", async function () {
      await expect(
        registry.connect(outsider).recordStage(1, 2, ethers.ZeroHash)
      ).to.be.revertedWithCustomError(registry, "NotStageUpdater");
    });

    it("refuses to move a stage backwards or repeat it", async function () {
      await registry.recordStage(1, 3, ethers.ZeroHash);
      await expect(
        registry.recordStage(1, 2, ethers.ZeroHash)
      ).to.be.revertedWithCustomError(registry, "StageNotIncreasing");
      await expect(
        registry.recordStage(1, 3, ethers.ZeroHash)
      ).to.be.revertedWithCustomError(registry, "StageNotIncreasing");
    });

    it("rejects a stage outside 1-5", async function () {
      await expect(
        registry.recordStage(1, 6, ethers.ZeroHash)
      ).to.be.revertedWithCustomError(registry, "StageOutOfRange");
    });

    it("rejects an unknown donation id", async function () {
      await expect(
        registry.recordStage(99, 2, ethers.ZeroHash)
      ).to.be.revertedWithCustomError(registry, "UnknownDonation");
    });
  });

  describe("admin", function () {
    it("can grant and revoke stage updaters", async function () {
      await registry.setStageUpdater(ngo.address, true);
      expect(await registry.stageUpdaters(ngo.address)).to.equal(true);
      await registry.setStageUpdater(ngo.address, false);
      expect(await registry.stageUpdaters(ngo.address)).to.equal(false);
    });

    it("blocks non-admins from granting updaters", async function () {
      await expect(
        registry.connect(outsider).setStageUpdater(outsider.address, true)
      ).to.be.revertedWithCustomError(registry, "NotAdmin");
    });

    it("transfers admin", async function () {
      await registry.transferAdmin(outsider.address);
      expect(await registry.admin()).to.equal(outsider.address);
    });
  });
});

// Matches any uint (used for block timestamps we cannot predict).
function anyUint() {
  const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
  return anyValue;
}
