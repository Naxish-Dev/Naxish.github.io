#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Helper script for Git operations

.DESCRIPTION
    Provides quick commands for common Git operations

.PARAMETER Action
    The action to perform: status, commit, push, pull, branch

.EXAMPLE
    .\git-helper.ps1 status
    .\git-helper.ps1 commit "feat: add new feature"
#>

param(
    [Parameter(Mandatory=$true, Position=0)]
    [ValidateSet('status', 'commit', 'push', 'pull', 'branch', 'changelog', 'release')]
    [string]$Action,
    
    [Parameter(Position=1)]
    [string]$Message = ""
)

function Show-Status {
    Write-Host "📊 Git Status:" -ForegroundColor Cyan
    git status
    Write-Host "`n📝 Recent Commits:" -ForegroundColor Cyan
    git log --oneline -5
    Write-Host "`n🌿 Current Branch:" -ForegroundColor Cyan
    git branch --show-current
}

function Do-Commit {
    if ([string]::IsNullOrEmpty($Message)) {
        Write-Host "❌ Error: Commit message required" -ForegroundColor Red
        Write-Host "Usage: .\git-helper.ps1 commit 'feat: your message'" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "📦 Staging changes..." -ForegroundColor Cyan
    git add .
    
    Write-Host "✍️  Committing with message: $Message" -ForegroundColor Cyan
    git commit -m $Message
    
    Write-Host "✅ Commit successful!" -ForegroundColor Green
}

function Do-Push {
    $branch = git branch --show-current
    Write-Host "🚀 Pushing to origin/$branch..." -ForegroundColor Cyan
    git push origin $branch
    Write-Host "✅ Push successful!" -ForegroundColor Green
}

function Do-Pull {
    $branch = git branch --show-current
    Write-Host "⬇️  Pulling from origin/$branch..." -ForegroundColor Cyan
    git pull origin $branch
    Write-Host "✅ Pull successful!" -ForegroundColor Green
}

function Show-Branches {
    Write-Host "🌿 Local Branches:" -ForegroundColor Cyan
    git branch
    Write-Host "`n🌐 Remote Branches:" -ForegroundColor Cyan
    git branch -r
}

function Generate-Changelog {
    Write-Host "📋 Generating changelog..." -ForegroundColor Cyan
    if (Test-Path "scripts/generate_changelog.py") {
        python scripts/generate_changelog.py
        Write-Host "✅ Changelog generated!" -ForegroundColor Green
    } else {
        Write-Host "❌ Error: Changelog script not found" -ForegroundColor Red
    }
}

function Create-Release {
    Write-Host "🏷️  Creating release..." -ForegroundColor Cyan
    
    $currentVersion = Get-Content VERSION -ErrorAction SilentlyContinue
    if ([string]::IsNullOrEmpty($currentVersion)) {
        $currentVersion = "2.0.0"
    }
    
    Write-Host "Current version: $currentVersion" -ForegroundColor Yellow
    $newVersion = Read-Host "Enter new version number (e.g., 2.1.0)"
    
    if ([string]::IsNullOrEmpty($newVersion)) {
        Write-Host "❌ Cancelled" -ForegroundColor Red
        exit 1
    }
    
    # Update VERSION file
    Set-Content -Path VERSION -Value $newVersion
    
    # Commit version bump
    git add VERSION
    git commit -m "chore: bump version to $newVersion"
    
    # Create tag
    $tagMessage = Read-Host "Enter release notes (or press Enter for default)"
    if ([string]::IsNullOrEmpty($tagMessage)) {
        $tagMessage = "Release version $newVersion"
    }
    
    git tag -a "v$newVersion" -m $tagMessage
    
    Write-Host "✅ Release v$newVersion created!" -ForegroundColor Green
    Write-Host "📤 Push with: git push origin main && git push origin v$newVersion" -ForegroundColor Cyan
}

# Main execution
switch ($Action) {
    'status' { Show-Status }
    'commit' { Do-Commit }
    'push' { Do-Push }
    'pull' { Do-Pull }
    'branch' { Show-Branches }
    'changelog' { Generate-Changelog }
    'release' { Create-Release }
}
