# ===================================
# This script increments the version of PF2e Statblock for Obsidian in the various files
# that need updating, git-commits the changes, creates a git-tag with the new
# version, then submits them.
# ===================================

param(
    [switch]$major = $false,
    [switch]$minor = $false,
    [switch]$patch = $false
)

# User must specify how the version is being incremented
if ((-not $major) -and (-not $minor) -and (-not $patch))
{
    Write-Error "Please specify exactly one of -major, -minor, or -patch."
    Exit -1
}

# User cannot specify more than one incrementation method
if (($major -and $minor) -or ($minor -and $patch) -or ($major -and $patch))
{
    Write-Error "Please specify exactly one of -major, -minor, or -patch."
    Exit -1
}

# PowerShell Core 7 or higher is required
if ($PSVersionTable.PSVersion.Major -lt 7)
{
    Write-Error "This script requires PowerShell version 7 or later."
    Exit -1
}

# Need Git
if ((Get-Command "git" -ErrorAction SilentlyContinue) -eq $null)
{
    Write-Error "Git is either not installed or not in your PATH."
    Exit -1
}

# Need NPM
if ((Get-Command "npm" -ErrorAction SilentlyContinue) -eq $null)
{
    Write-Error "NPM is either not installed or not in your PATH."
    Exit -1
}

$current_dir = Get-Location

# Check if package.json exists
$package_json_path = Join-Path $current_dir package.json
if (-not (Test-Path -Path $package_json_path -PathType leaf))
{
    Write-Error "package.json is missing!"
    Exit -1
}

# Read package.json
$package_json_contents = Get-Content -Path $package_json_path
if ($package_json_contents.Count -lt 1)
{
    Write-Error "package.json is empty!"
    Exit -1
}

# Find current version
$version_string = ""
$version_format_regex = '[0-9]+\.[0-9]+\.[0-9]+'
$version_line = -1
for($i = 0; $i -lt $package_json_contents.Count; $i++)
{
    $line = $package_json_contents[$i]
    if ($line -match (-join ('"version": "', $version_format_regex)))
    {
        $version_line = $i
        # Extract version number by removing everything else from the line
        $version_string = $line.Replace('"version": "', "").Replace('"', "").Replace(",", "").Trim()
        break
    }
}

# Make sure we actually found the version
if ($version_line -eq -1)
{
    Write-Error "package.json is missing version info!"
    Exit -1
}
elseif (-not ($version_string -match $version_format_regex))
{
    Write-Error "package.json version info malformed: $version_string!"
    Exit -1
}
else
{
    Write-Output "Found current version $version_string."
}

# Split version into three ints for incrementation
$split_version = $version_string.Split(".")
$version_major = [int]::Parse($split_version[0])
$version_minor = [int]::Parse($split_version[1])
$version_patch = [int]::Parse($split_version[2])

# Increment version according to type
if ($major)
{
    $version_major++
    $version_minor = 0
    $version_patch = 0
}
elseif ($minor)
{
    $version_minor++
    $version_patch = 0
}
else #patch
{
    $version_patch++
}

# Format new version string
$new_version = "$version_major.$version_minor.$version_patch"
Write-Output "Version is now $new_version."

# Replace version in package.json
$package_json_contents[$version_line] = $package_json_contents[$version_line].Replace($version_string, $new_version)
Set-Content -Path $package_json_path -Value $package_json_contents

# Get this all sorted for git
git add "./package.json"
npm run version		# Updates manifest.json and versions.json to match and also stages them
git commit -m "Version updated to $new_version"
git tag -a $new_version -m "$new_version"
git push
git push origin $new_version

Write-Output "Version update complete and submitted!"
Exit 0