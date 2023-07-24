import React, { useCallback, useEffect, useState } from "react";
import { connect } from "react-redux";
import { Alert, Col, Row, Table } from "reactstrap";
import { ConfigType } from "../redux/reducers/systemReducer";
import { PageTitle } from "../components/PageTitle";
import { useParams } from "react-router-dom";
import { ethers } from "ethers/lib.esm";
import { Page404 } from "./errors/Page404";
import { GameWrap } from "../components/GameWrap";
import { TokenDataType } from "../types/token";
import { TokenWrap } from "../components/TokenWrap";
import {
  getExplorerAddressLink,
  getExplorerTransactionLink, shortenAddress,
  shortenTransactionHash,
  useEthers,
  useLogs,
} from "@usedapp/core";
import { Contract } from "@ethersproject/contracts";
import TicTacToeERC20Abi from "../contracts/TicTacToeERC20.sol/TicTacToeERC20.json";
import axios from "axios";
import { toast } from "react-toastify";
import { PlayTicTacToeModal } from "../components/modals/TicTacToe/PlayTicTacToeModal";
import { CancelGameModal } from "../components/modals/CancelGameModal";
import { TimeoutGameModal } from "../components/modals/TimeoutGameModal";
import { StepTicTacToeModal } from "../components/modals/TicTacToe/StepTicTacToeModal";
import { GameDataType } from "../types/game";
import { FactoryWrap } from "../components/FactoryWrap";

const GAME_STATUS_WAIT = 0;
const GAME_STATUS_PROGRESS = 1;
const GAME_STATUS_FINISHED = 2;
const GAME_STATUS_CANCELED = 3;

const statuses = [
  "Wait player", "Wait step", "Finished", "Canceled",
];
const sides = [
  "NONE", "Player 1", "Player 2",
];

const Component = ({ configs }: { configs: ConfigType }) => {
  const { account, chainId } = useEthers();
  const { gameAddress } = useParams();
  const [errors, setErrors] = useState<any>({});
  const [gameData, setGameData] = useState<GameDataType>();
  if (!gameAddress || !ethers.utils.isAddress(gameAddress)) {
    return <Page404 />;
  }
  const fetchData = useCallback(() => {
    axios.get("/api/explore/" + chainId + "/details/" + gameAddress).then(({ data }: {
      data: { game: GameDataType }
    }) => {
      setGameData(data.game);
    }).catch((reason) => {
      toast.error(reason.message);
    });
  }, [chainId, gameAddress]);
  useEffect(() => {
    if (chainId) {
      fetchData();
    }
  }, [
    chainId, gameAddress,
  ]);

  const logs = useLogs({
    contract: new Contract(gameAddress, TicTacToeERC20Abi.abi),
    event: "GameStep",
    args: [],
  });
  console.log("logs", logs);
  if (!gameData) {
    return <></>;
  }
  const currentTime = 0;
  return <>
    <div className="mt-5 py-5">
      <PageTitle title={"Blockchain Game Details"} />
      {account ?
        <FactoryWrap
          account={account} factoryAddress={gameData.factoryAddress} errors={errors} setErrors={setErrors}
          children={(factoryData) => {
            console.log('factoryData', factoryData);
            return <GameWrap
              errors={errors} setErrors={setErrors} gameAddress={gameData.address} children={(gameStatusData) => {
              console.log('gameStatusData', gameStatusData);
              return <TokenWrap
                tokenAddress={gameData.tokenAddress} account={account} setErrors={setErrors}
                spenderAddress={gameAddress} children={(tokenData: TokenDataType) => {
                return <Row>
                  <Col sm={6}>
                    <dl className="row">
                      <dt className="col-sm-3">Type</dt>
                      <dd className="col-sm-9">Tic Tac Toe</dd>
                    </dl>
                    <dl className="row">
                      <dt className="col-sm-3">Status</dt>
                      <dd className="col-sm-9">
                        {statuses[gameStatusData.status]}
                        {gameStatusData?.status != GAME_STATUS_WAIT ? <>{" "}
                          Player{gameStatusData?.currentTurn}
                        </> : null}
                      </dd>
                    </dl>
                    <dl className="row">
                      <dt className="col-sm-3">Contract Address</dt>
                      <dd className="col-sm-9">{gameAddress}</dd>
                    </dl>
                    <dl className="row">
                      <dt className="col-sm-3">Player1</dt>
                      <dd className="col-sm-9">
                        <a
                          href={chainId ? getExplorerAddressLink(gameData?.creatorAddress, chainId) : ""}>{shortenAddress(gameData.creatorAddress)}</a>
                      </dd>
                    </dl>
                    {gameStatusData?.status != GAME_STATUS_WAIT ? <>
                      <dl className="row">
                        <dt className="col-sm-3">Player2</dt>
                        <dd className="col-sm-9">
                          <a
                            href={chainId ? getExplorerAddressLink(gameStatusData.player2, chainId) : ""}>{shortenAddress(gameStatusData.player2)}</a>
                        </dd>
                      </dl>
                    </> : null}
                    <dl className="row">
                      <dt className="col-sm-3">Bet</dt>
                      <dd className="col-sm-9">
                        {ethers.utils.formatUnits(gameData.params.coins, tokenData.decimals)}{" "}
                        <a
                          href={chainId ? getExplorerAddressLink(tokenData.address, chainId) : ""}>{tokenData.name} ({tokenData.symbol})</a>
                      </dd>
                    </dl>
                    <dl className="row">
                      <dt className="col-sm-3">Timeout</dt>
                      <dd className="col-sm-9">{gameData.params.timeout} sec.</dd>
                    </dl>
                    <dl className="row">
                      <dt className="col-sm-3">Size</dt>
                      <dd className="col-sm-9">{gameData.params.size} x {gameData.params.size}</dd>
                    </dl>
                    {gameStatusData?.status == GAME_STATUS_WAIT ? <>
                  <span className="me-2">
                    <PlayTicTacToeModal configs={configs} game={gameData} />
                  </span>
                        {gameData?.creatorAddress == account ? <CancelGameModal gameAddress={gameAddress} /> : null}
                      </>
                      : null}
                    {gameStatusData?.status == GAME_STATUS_PROGRESS && gameStatusData?.lastStepTime + gameData.params.timeout < factoryData.currentTime ? <>
                      {gameData?.creatorAddress == account ? <TimeoutGameModal gameAddress={gameAddress} /> : null}
                    </> : null}
                  </Col>
                  <Col sm={6}>
                    <h3>Steps</h3>
                    <Table>
                      <tbody>
                      <tr>
                        <th>
                          Block
                        </th>
                        <th>
                          Tx
                        </th>
                        <th>
                          Side
                        </th>
                        <th>
                          Cell
                        </th>
                      </tr>
                      </tbody>
                      {logs && logs.value && logs.value.map((log) => <tr>
                        <td>
                          {log.blockNumber}
                        </td>
                        <td>
                          <a
                            href={chainId ? getExplorerTransactionLink(log.transactionHash, chainId) : ""}>{shortenTransactionHash(log.transactionHash)}</a>
                        </td>
                        <td>
                          Player{log.data.side}
                        </td>
                        <td>
                          {log.data.row} x {log.data.col}
                        </td>
                      </tr>)}
                    </Table>
                    <StepTicTacToeModal gameAddress={gameAddress} />
                  </Col>
                </Row>;
              }} />;
            }} />;
          }} />
        : <div>
          <Alert color="info">
            <h4 className="alert-heading">
              Connect your wallet!
            </h4>
            <p>If you don't have a wallet yet, you can select a provider and create one now.</p>
          </Alert>
        </div>}
    </div>
  </>;
};

const Connected = connect((store: any) => ({
  configs: store.system.configs,
}), {})(Component);

export const GamePage = (props: any) => {
  console.log("props", props);
  return <Connected {...props} />;
};
