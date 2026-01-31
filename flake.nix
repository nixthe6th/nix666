{
  description = "nix666 - Rapid dev environments and Nix utilities";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        
        # Custom dev shell with common tools
        devShell = pkgs.mkShell {
          name = "nix666-dev";
          packages = with pkgs; [
            git
            gh
            jq
            curl
            wget
            tree
            fd
            ripgrep
            eza
            bat
            fzf
            zoxide
            direnv
            nix-direnv
          ];
          
          shellHook = ''
            echo "🌀 nix666 dev shell activated"
            echo "Tools: git, gh, jq, fd, rg, eza, bat, fzf, zoxide, direnv"
          '';
        };

        # Utility script: nix-quick
        nix-quick = pkgs.writeScriptBin "nix-quick" ''
          #!${pkgs.bash}/bin/bash
          # nix-quick: Quick nix shell with common packages
          
          usage() {
            echo "Usage: nix-quick [lang]"
            echo "Languages: py (python), js (nodejs), go, rust, zig"
          }
          
          case "$1" in
            py|python)
              nix shell nixpkgs#python3 nixpkgs#python3Packages.pip nixpkgs#python3Packages.virtualenv
              ;;
            js|node|nodejs)
              nix shell nixpkgs#nodejs nixpkgs#pnpm nixpkgs#yarn
              ;;
            go|golang)
              nix shell nixpkgs#go nixpkgs#gopls nixpkgs#delve
              ;;
            rust)
              nix shell nixpkgs#rustc nixpkgs#cargo nixpkgs#rustfmt nixpkgs#clippy
              ;;
            zig)
              nix shell nixpkgs#zig nixpkgs#zls
              ;;
            *)
              usage
              exit 1
              ;;
          esac
        '';

        # Utility script: nix-init
        nix-init = pkgs.writeScriptBin "nix-init" (
          builtins.replaceStrings ["@TEMPLATE_DIR@"] ["${self}/templates"] 
          (builtins.readFile ./scripts/nix-init)
        );

        # Utility script: nix-tmp
        nix-tmp = pkgs.writeScriptBin "nix-tmp" (builtins.readFile ./scripts/nix-tmp);

        # Utility script: nix-fmt
        nix-fmt = pkgs.writeScriptBin "nix-fmt" (builtins.readFile ./scripts/nix-fmt);

      in {
        devShells.default = devShell;
        packages.nix-quick = nix-quick;
        packages.nix-init = nix-init;
        packages.nix-tmp = nix-tmp;
        packages.nix-fmt = nix-fmt;
        packages.default = nix-quick;
        
        apps.nix-quick = flake-utils.lib.mkApp {
          drv = nix-quick;
        };
        apps.nix-init = flake-utils.lib.mkApp {
          drv = nix-init;
        };
        apps.nix-tmp = flake-utils.lib.mkApp {
          drv = nix-tmp;
        };
        apps.nix-fmt = flake-utils.lib.mkApp {
          drv = nix-fmt;
        };
      }) // {
        # Templates for `nix flake init`
        templates.basic = {
          path = ./templates/basic;
          description = "Basic nix666 project template";
        };
        templates.default = self.templates.basic;
      };
}
