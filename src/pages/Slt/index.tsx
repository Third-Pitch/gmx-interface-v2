import { useWeb3React } from "@web3-react/core";
import Button from "components/Button/Button";
import { getContract } from "config/contracts";
import { ethers } from "ethers";
import { getProvider } from "lib/rpc";
import { useState } from "react";
import slt from '../../abis/slt.json';
import { contractFetcher } from "lib/contracts";

const Slt = () => {
    const [val, setVal] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const { library, chainId } = useWeb3React();
    const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
        if (!/^(0x)?[0-9a-fA-F]{40}$/.test(val)) {
            throw new Error("地址不正确");
        }
        setLoading(true);
        event.preventDefault();
        // contractFetcher(undefined, { abi: slt }, [val])
        // console.log(123123);
        const referralStorageAddress = val;
        const provider = getProvider(library, chainId!);
        console.log(123, referralStorageAddress, provider, chainId)
        const contract = new ethers.Contract(referralStorageAddress, slt, provider);
        await contract.claimDroplet();
        // console.log(123123);
        setLoading(false);
        // return codeOwner;
    }
    return (
        <div className="referral-card section-center mt-medium">
            <h2 className="title">
                快来领取赏赐
            </h2>
            <p className="sub-title">
                哈哈哈哈
            </p>
            <div className="card-action">
                <form onSubmit={handleSubmit}>
                    <input
                        // ref={inputRef}
                        // disabled={isSubmitting}
                        type="text"
                        placeholder="输入合约地址"
                        className="text-input mb-sm"
                        value={val}
                        onChange={(e) => setVal(e.target.value)}
                    // value={referralCode}
                    // onChange={({ target }) => {
                    //     const { value } = target;
                    //     setReferralCode(value);
                    // }}
                    />
                    <Button
                        disabled={loading}
                        variant="primary-action"
                        type="submit"
                        className="App-cta Exchange-swap-button"
                    >
                        {loading ? "领取中..." : `耻辱拿走😧`}
                    </Button>
                </form>
                {/* {active ? (
                    <ReferralCodeForm setPendingTxns={setPendingTxns} pendingTxns={pendingTxns} />
                ) : (
                    <Button variant="primary-action" className="w-full" type="submit" onClick={connectWallet}>
                        <Trans>Connect Wallet</Trans>
                    </Button>
                )} */}
            </div>
        </div>
    )
}

export default Slt;