import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("IntegrityRegistryModule", (m) => {
  const integrityRegistry = m.contract("IntegrityRegistry");

  return {
    integrityRegistry,
  };
});