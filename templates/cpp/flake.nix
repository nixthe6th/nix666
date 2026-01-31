{
  description = "C/C++ project with CMake";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }: let
    system = builtins.currentSystem;
    pkgs = nixpkgs.legacyPackages.${system};
  in {
    devShells.${system}.default = pkgs.mkShell {
      packages = with pkgs; [
        gcc
        cmake
        gnumake
        gdb
        valgrind
        clang-tools
      ];
      shellHook = ''
        echo "🔨 C/C++ ready (gcc $(gcc --version | head -n1 | awk '{print $3}'))"
        [ -d build ] || mkdir build
      '';
    };

    packages.${system}.default = pkgs.stdenv.mkDerivation {
      name = "app";
      src = ./.;
      nativeBuildInputs = [ pkgs.cmake ];
      buildInputs = [ ];
    };
  };
}
