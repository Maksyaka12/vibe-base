# Deploys VibeAchievementsV2 from a browser wallet (MetaMask). Owner is set in the constructor, so the
# deploying wallet only pays gas. The six official staking vaults (epochs 1-6) are registered at deploy;
# later epochs are added with addVault.
#   .\script\deploy-achievements.ps1
$forge = 'C:\Users\builder\.foundry\bin\forge.exe'
$owner = '0x4c91D3BEd372C11795b9Ce9a9017dFE447Bf050a'
$checkIn = '0x1938BA215ef556e51eE6AaF909e0970AE0167634'
$staking = '0x6f25a9e1e677616c1bF7ab54b470b0c82839Adb4'
$vaults = '[0xafa3ce23e0043b651d98e5a89b55a80b71be2f4a945a745cd6e37316b5075663,0x5dcabfeb83e84ad87572c531dfa8de915e0b5d8c11e4ca39598a3c6b4fc1e446,0x5a0d6075197085da4e2b9a790f3be8c297d08effcfca677992489668ebcf8b0c,0xdd9b4d063653fcc4d8b64d42edfe156002e863b15297d059463554182fa50dd9,0x795d393bdf9582ac8678aceb6f2228118ae2456406da38a8cb35967c033c0713,0x110cf0164a5244daf1e3f804d9bcc2b55b1cfbc95ff327aadf82ca3d664d2d08]'

Set-Location (Join-Path $PSScriptRoot '..')
& $forge create src/VibeAchievementsV2.sol:VibeAchievementsV2 `
  --rpc-url https://mainnet.base.org `
  --browser `
  --broadcast `
  --constructor-args $owner $checkIn $staking $vaults
