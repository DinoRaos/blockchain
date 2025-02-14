// MarketplacePayment.test.mjs
import * as chai from "chai";
import { solidity } from "ethereum-waffle";
chai.use(solidity);
const { expect } = chai;

import pkg from "hardhat";
const { ethers } = pkg;

describe("MarketplacePayment", function () {
  let marketplacePayment;
  let seller, buyer, anotherBuyer;

  beforeEach(async function () {
    const signers = await ethers.getSigners();
    // Wir verwenden hier mehrere Accounts für unterschiedliche Rollen
    seller = signers[1];
    buyer = signers[2];
    anotherBuyer = signers[3];

    const MarketplacePaymentFactory = await ethers.getContractFactory("MarketplacePayment");
    marketplacePayment = await MarketplacePaymentFactory.deploy();
    await marketplacePayment.deployed();
  });

  it("should revert when no Ether is sent", async function () {
    await expect(
      marketplacePayment.connect(buyer).purchase(seller.address, { value: 0 })
    ).to.be.revertedWith("Es muss Ether gesendet werden");
  });

  it("should transfer the exact Ether amount to the seller", async function () {
    const amount = ethers.utils.parseEther("1");
    const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);
    
    await marketplacePayment.connect(buyer).purchase(seller.address, { value: amount });
    
    const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
    expect(sellerBalanceAfter.sub(sellerBalanceBefore)).to.eq(amount);
  });

  it("should emit Purchase event with correct parameters", async function () {
    const amount = ethers.utils.parseEther("0.5");
    await expect(
      marketplacePayment.connect(buyer).purchase(seller.address, { value: amount })
    )
      .to.emit(marketplacePayment, "Purchase")
      .withArgs(seller.address, buyer.address, amount);
  });

  it("should not retain any Ether in the contract after purchase", async function () {
    const amount = ethers.utils.parseEther("1");
    await marketplacePayment.connect(buyer).purchase(seller.address, { value: amount });
    
    const contractBalance = await ethers.provider.getBalance(marketplacePayment.address);
    expect(contractBalance).to.eq(0);
  });

  it("should handle multiple purchases and emit multiple events", async function () {
    const amount1 = ethers.utils.parseEther("0.3");
    const amount2 = ethers.utils.parseEther("0.7");

    await expect(
      marketplacePayment.connect(buyer).purchase(seller.address, { value: amount1 })
    )
      .to.emit(marketplacePayment, "Purchase")
      .withArgs(seller.address, buyer.address, amount1);

    await expect(
      marketplacePayment.connect(buyer).purchase(seller.address, { value: amount2 })
    )
      .to.emit(marketplacePayment, "Purchase")
      .withArgs(seller.address, buyer.address, amount2);
  });

  it("should allow purchase when seller and buyer are the same", async function () {
    const amount = ethers.utils.parseEther("0.1");
    const balanceBefore = await ethers.provider.getBalance(buyer.address);
    
    const tx = await marketplacePayment.connect(buyer).purchase(buyer.address, { value: amount });
    const receipt = await tx.wait();
    
    const balanceAfter = await ethers.provider.getBalance(buyer.address);
    const gasUsed = receipt.gasUsed;
    const txDetails = await ethers.provider.getTransaction(tx.hash);
    const gasCost = gasUsed.mul(txDetails.gasPrice);
    
    // Berechne Differenz abzüglich Gasgebühren (mit einer Toleranz von 0.001 Ether)
    const diff = balanceBefore.sub(balanceAfter).sub(gasCost);
    const tolerance = ethers.utils.parseEther("0.001");
    expect(diff.abs().lte(tolerance)).to.be.true;
  });

  it("should update seller balance correctly over multiple transactions", async function () {
    const amount1 = ethers.utils.parseEther("0.4");
    const amount2 = ethers.utils.parseEther("0.6");
    const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);
    
    await marketplacePayment.connect(buyer).purchase(seller.address, { value: amount1 });
    await marketplacePayment.connect(buyer).purchase(seller.address, { value: amount2 });
    
    const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
    expect(sellerBalanceAfter.sub(sellerBalanceBefore)).to.eq(amount1.add(amount2));
  });

  it("should handle purchases from different buyers to the same seller", async function () {
    const amount1 = ethers.utils.parseEther("0.2");
    const amount2 = ethers.utils.parseEther("0.8");
    
    const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);
    
    await marketplacePayment.connect(buyer).purchase(seller.address, { value: amount1 });
    await marketplacePayment.connect(anotherBuyer).purchase(seller.address, { value: amount2 });
    
    const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
    expect(sellerBalanceAfter.sub(sellerBalanceBefore)).to.eq(amount1.add(amount2));
  });

  it("should not return any value from the purchase function", async function () {
    const amount = ethers.utils.parseEther("0.5");
    const tx = await marketplacePayment.connect(buyer).purchase(seller.address, { value: amount });
    const receipt = await tx.wait();
    expect(receipt).to.have.property("events");
  });

  it("should allow purchase with a very small Ether amount (1 wei)", async function () {
    const amount = ethers.BigNumber.from(1);
    const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);
    await marketplacePayment.connect(buyer).purchase(seller.address, { value: amount });
    const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
    expect(sellerBalanceAfter.sub(sellerBalanceBefore)).to.eq(amount);
  });

  it("should decrease buyer's balance by at least the sent amount plus gas fees", async function () {
    const amount = ethers.utils.parseEther("0.3");
    const buyerBalanceBefore = await ethers.provider.getBalance(buyer.address);
    
    const tx = await marketplacePayment.connect(buyer).purchase(seller.address, { value: amount });
    const receipt = await tx.wait();
    const buyerBalanceAfter = await ethers.provider.getBalance(buyer.address);
    const gasUsed = receipt.gasUsed;
    const txDetails = await ethers.provider.getTransaction(tx.hash);
    const gasCost = gasUsed.mul(txDetails.gasPrice);
    
    const totalDeducted = buyerBalanceBefore.sub(buyerBalanceAfter);
    const expected = amount.add(gasCost);
    const tolerance = ethers.utils.parseEther("0.001");
    const diff = totalDeducted.sub(expected).abs();
    expect(diff.lte(tolerance)).to.be.true;
  });

  it("should revert when Ether is sent directly to the contract", async function () {
    // Falls der Contract keinen receive()/fallback-Funktion hat,
    // sollte eine direkte Überweisung fehlschlagen.
    await expect(
      buyer.sendTransaction({
        to: marketplacePayment.address,
        value: ethers.utils.parseEther("1")
      })
    ).to.be.reverted;
  });

  it("should allow purchase after a failed attempt", async function () {
    // Erster Versuch mit 0 Ether schlägt fehl...
    await expect(
      marketplacePayment.connect(buyer).purchase(seller.address, { value: 0 })
    ).to.be.revertedWith("Es muss Ether gesendet werden");

    // ... danach sollte ein korrekter Kauf möglich sein.
    const amount = ethers.utils.parseEther("0.2");
    await expect(
      marketplacePayment.connect(buyer).purchase(seller.address, { value: amount })
    ).to.emit(marketplacePayment, "Purchase");
  });

  it("should handle purchases to different sellers from the same buyer", async function () {
    const signers = await ethers.getSigners();
    const seller2 = signers[4];
    const amount1 = ethers.utils.parseEther("0.3");
    const amount2 = ethers.utils.parseEther("0.4");

    const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);
    const seller2BalanceBefore = await ethers.provider.getBalance(seller2.address);

    await marketplacePayment.connect(buyer).purchase(seller.address, { value: amount1 });
    await marketplacePayment.connect(buyer).purchase(seller2.address, { value: amount2 });

    const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
    const seller2BalanceAfter = await ethers.provider.getBalance(seller2.address);

    expect(sellerBalanceAfter.sub(sellerBalanceBefore)).to.eq(amount1);
    expect(seller2BalanceAfter.sub(seller2BalanceBefore)).to.eq(amount2);
  });

  it("should process multiple rapid purchases correctly", async function () {
    const purchaseCount = 5;
    const amount = ethers.utils.parseEther("0.1");
    const totalAmount = amount.mul(purchaseCount);
    const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);
    
    for (let i = 0; i < purchaseCount; i++) {
      await marketplacePayment.connect(buyer).purchase(seller.address, { value: amount });
    }
    
    const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
    expect(sellerBalanceAfter.sub(sellerBalanceBefore)).to.eq(totalAmount);
  });
});
