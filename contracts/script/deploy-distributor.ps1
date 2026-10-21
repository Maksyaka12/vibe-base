# Deploys one VibeRewardsDistributor from a browser wallet (MetaMask): opens a localhost page to connect
# and confirm. Owner is set in the constructor, so the deploying wallet only pays gas.
#   .\script\deploy-distributor.ps1
$forge = 'C:\Users\builder\.foundry\bin\forge.exe'
$vibe = '0xb200000000000000000000DF24eCb8bF51100a01'
$owner = '0x4c91D3BEd372C11795b9Ce9a9017dFE447Bf050a'

Set-Location (Join-Path $PSScriptRoot '..')
& $forge create src/VibeRewardsDistributor.sol:VibeRewardsDistributor `
  --rpc-url https://mainnet.base.org `
  --browser `
  --broadcast `
  --constructor-args $vibe $owner
