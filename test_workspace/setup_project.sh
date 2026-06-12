#!/bin/bash

# Create main test workspace directory
mkdir -p test_workspace

# Create standard directories as defined in the whitepaper
mkdir -p test_workspace/input
mkdir -p test_workspace/transcript
mkdir -p test_workspace/script
mkdir -p test_workspace/slides
mkdir -p test_workspace/assets
mkdir -p test_workspace/clips
mkdir -p test_workspace/hyperframe
mkdir -p test_workspace/output

# Create methods and qa directories for scripts
mkdir -p test_workspace/methods
mkdir -p test_workspace/qa

echo "Project structure initialized successfully in test_workspace/"
