# Verifies the three v2 contracts on Basescan (Etherscan V2 API, chain 8453).
# The key is read from contracts/.env (ETHERSCAN_API_KEY=...), which git ignores. Get a free key at
# https://etherscan.io/myapikey (one key works for every chain, Base included).
#   .\script\verify-basescan.ps1
$forge = 'C:\Users\builder\.foundry\bin\forge.exe'
$cast = 'C:\Users\builder\.foundry\bin\cast.exe'
Set-Location (Join-Path $PSScriptRoot '..')

$envFile = Join-Path (Get-Location) '.env'
if (-not $env:ETHERSCAN_API_KEY -and (Test-Path $envFile)) {
  foreach ($line in Get-Content $envFile) {
    if ($line -match '^\s*ETHERSCAN_API_KEY\s*=\s*(.+?)\s*$') { $env:ETHERSCAN_API_KEY = $Matches[1].Trim('"') }
  }
}
if (-not $env:ETHERSCAN_API_KEY) {
  Write-Host 'ETHERSCAN_API_KEY not found: add it to contracts\.env (ETHERSCAN_API_KEY=your_key)'
  exit 1
}

$vibe = '0xb200000000000000000000DF24eCb8bF51100a01'
$owner = '0x4c91D3BEd372C11795b9Ce9a9017dFE447Bf050a'
$distributorArgs = & $cast abi-encode 'constructor(address,address)' $vibe $owner
$achievementArgs = & $cast abi-encode 'constructor(address,address,address,bytes32[])' $owner '0x1938BA215ef556e51eE6AaF909e0970AE0167634' '0x6f25a9e1e677616c1bF7ab54b470b0c82839Adb4' '[0xafa3ce23e0043b651d98e5a89b55a80b71be2f4a945a745cd6e37316b5075663,0x5dcabfeb83e84ad87572c531dfa8de915e0b5d8c11e4ca39598a3c6b4fc1e446,0x5a0d6075197085da4e2b9a790f3be8c297d08effcfca677992489668ebcf8b0c,0xdd9b4d063653fcc4d8b64d42edfe156002e863b15297d059463554182fa50dd9,0x795d393bdf9582ac8678aceb6f2228118ae2456406da38a8cb35967c033c0713,0x110cf0164a5244daf1e3f804d9bcc2b55b1cfbc95ff327aadf82ca3d664d2d08]'

$contracts = @(
  @{ name = 'Holder rewards'; address = '0x90B855994D9ba328399d87d0285b7D7f7B8E2c80'; id = 'src/VibeRewardsDistributor.sol:VibeRewardsDistributor'; args = $distributorArgs },
  @{ name = 'Royalties'; address = '0xeEb47756fBf417907B2Be94aCcfB851a224add2c'; id = 'src/VibeRewardsDistributor.sol:VibeRewardsDistributor'; args = $distributorArgs },
  @{ name = 'Achievements'; address = '0x1336E381768c98c8A6e79d99Ec065684c41925A5'; id = 'src/VibeAchievementsV2.sol:VibeAchievementsV2'; args = $achievementArgs }
)

foreach ($c in $contracts) {
  Write-Host "`n=== $($c.name) $($c.address)"
  & $forge verify-contract $c.address $c.id --chain 8453 --verifier etherscan --etherscan-api-key $env:ETHERSCAN_API_KEY --constructor-args $c.args --watch
}
