//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {HexUtils} from "../utils/HexUtils.sol";
import {NameCoder} from "../utils/NameCoder.sol";

uint256 constant COIN_TYPE_ETH = 60;
uint256 constant EVM_BIT = 1 << 31;

string constant SLUG_ETH = "addr"; // <=> COIN_TYPE_ETH
string constant SLUG_DEFAULT = "default"; // <=> EVM_BIT

/// @dev Library for generating reverse names according to ENSIP-19.
/// https://docs.ens.domains/ensip/19
library ENSIP19 {
    /// @dev The supplied address was `0x`.
    error EmptyAddress();

    /// @dev Extract Chain ID from `coinType`.
    /// @param coinType The coin type.
    /// @return chain The Chain ID or 0 if non-EVM Chain.
    function chainFromCoinType(
        uint256 coinType
    ) internal pure returns (uint32 chain) {
        if (coinType == COIN_TYPE_ETH) return 1;
        return
            uint32(
                uint32(coinType) == coinType && (coinType & EVM_BIT) != 0
                    ? coinType ^ EVM_BIT
                    : 0
            );
    }

    /// @dev Determine if Coin Type is for an EVM address.
    /// @param coinType The coin type.
    /// @return isEVM True if coin type represents an EVM address.
    function isEVMCoinType(
        uint256 coinType
    ) internal pure returns (bool isEVM) {
        isEVM = chainFromCoinType(coinType) != 0 || coinType == EVM_BIT;
    }

    /// @dev Same as `reverseName()` but uses EVM Address + Chain ID.
    function reverseName(
        address addr,
        uint64 chain
    ) internal pure returns (string memory) {
        return
            reverseName(
                abi.encodePacked(addr),
                chain == 1 ? COIN_TYPE_ETH : chain | EVM_BIT
            );
    }

    /// @dev Generate Reverse Name from Encoded Address + Coin Type.
    ///      Reverts `EmptyAddress` if `encodedAddress` is `0x`.
    /// @param encodedAddress The input address.
    /// @param coinType The coin type.
    /// @return name The ENS reverse name, eg. `1234abcd.addr.reverse`.
    function reverseName(
        bytes memory encodedAddress,
        uint256 coinType
    ) internal pure returns (string memory name) {
        if (encodedAddress.length == 0) revert EmptyAddress();
        name = string(
            abi.encodePacked(
                HexUtils.bytesToHex(encodedAddress),
                ".",
                coinType == COIN_TYPE_ETH
                    ? SLUG_ETH
                    : coinType == EVM_BIT
                        ? SLUG_DEFAULT
                        : HexUtils.unpaddedUintToHex(coinType, true),
                ".reverse"
            )
        );
    }

    /// @dev Parse Reverse Name into Encoded Address + Coin Type.
    ///      Matches: /^[0-9a-f]{1,}\.([0-9a-f]{1,32}|addr|default)\.reverse$/i.
    ///      Reverts `DNSDecodingFailed`.
    /// @param name The DNS-encoded name.
    /// @return encodedAddress The address or empty if invalid.
    /// @return coinType The coin type.
    function parse(
        bytes memory name
    ) internal pure returns (bytes memory encodedAddress, uint256 coinType) {
        (, uint256 offset) = NameCoder.readLabel(name, 0);
        bool valid;
        (encodedAddress, valid) = HexUtils.hexToBytes(name, 1, offset);
        if (!valid) return ("", 0); // encodedAddress not hex
        (bytes32 labelHash, uint256 offset2) = NameCoder.readLabel(
            name,
            offset
        );
        if (labelHash == keccak256(bytes(SLUG_ETH))) {
            coinType = COIN_TYPE_ETH;
        } else if (labelHash == keccak256(bytes(SLUG_DEFAULT))) {
            coinType = EVM_BIT;
        } else {
            bytes32 word;
            (word, valid) = HexUtils.hexStringToBytes32(
                name,
                1 + offset,
                offset2
            );
            if (!valid) return ("", 0); // unknown coinType
            coinType = uint256(word);
        }
        (labelHash, offset) = NameCoder.readLabel(name, offset2);
        if (labelHash != keccak256("reverse")) return ("", 0);
        (labelHash, ) = NameCoder.readLabel(name, offset);
        if (labelHash != bytes32(0)) return ("", 0);
    }
}
