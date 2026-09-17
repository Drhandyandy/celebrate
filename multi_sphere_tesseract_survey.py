#!/usr/bin/env python3
"""
BETTER TEST: MULTI-SPHERE TESSERACT SURVEY
Center-aware, boundary-aware, mirror-aware, tautology-aware.

This script surveys 26 standard cryptographic curves against a multi-sphere
background (Carmichael numbers, Hasse bounds, and p+n offsets) to detect
geometric alignments within an 8-octant Tesseract structure.
"""

import math
import random
from collections import Counter
from math import isqrt

# =============================================================================
# TESSERACT STRUCTURE
# =============================================================================

# Sign patterns for the 8 octants of the tesseract
CELL_SIGNS = {
    0: ( 1,  1,  1),   1: (-1,  1,  1),
    2: ( 1, -1,  1),   3: (-1, -1,  1),
    4: ( 1,  1, -1),   5: (-1,  1, -1),
    6: ( 1, -1, -1),   7: (-1, -1, -1),
}

PURE_CELLS  = {0, 7}  # (+++) and (---)
MIXED_CELLS = {1, 2, 3, 4, 5, 6}

# Topological mappings
ANTIPODAL = {0:7, 1:6, 2:5, 3:4, 4:3, 5:2, 6:1, 7:0}
MIRROR_X  = {0:1, 1:0, 2:3, 3:2, 4:5, 5:4, 6:7, 7:6}
MIRROR_Y  = {0:2, 1:3, 2:0, 3:1, 4:6, 5:7, 6:4, 7:5}
MIRROR_Z  = {0:4, 1:5, 2:6, 3:7, 4:0, 5:1, 6:2, 7:3}

# =============================================================================
# CURVE DATABASE (26 curves, p and n only for clarity)
# =============================================================================

CURVES = {
    "secp112r1": (0xDB7C2ABF62E35E668076BEAD208B, 0xDB7C2ABF62E35E7628DFAC6561C5),
    "secp128r1": (0xFFFFFFFDFFFFFFFFFFFFFFFFFFFFFFFF, 0xFFFFFFFE0000000075A30D1B9038A115),
    "secp160k1": (0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFAC73, 0x0100000000000000000001B8FA16DFAB9ACA16B6B3),
    "secp160r1": (0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF7FFFFFFF, 0x0100000000000000000001F4C8F927AED3CA752257),
    "secp160r2": (0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFAC73, 0x0100000000000000000000351EE786A818F3A1A16B),
    "secp192k1": (0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFEE37, 0xFFFFFFFFFFFFFFFFFFFFFFFE26F2FC170F69466A74DEFD8D),
    "secp192r1": (0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFFFFFFFFFFFF, 0xFFFFFFFFFFFFFFFFFFFFFFFF99DEF836146BC9B1B4D22831),
    "secp224k1": (0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFE56D, 0x010000000000000000000000000001DCE8D2EC6184CAF0A971769FB1F7),
    "secp224r1": (0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF000000000000000000000001, 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFF16A2E0B8F03E13DD29455C5C2A3D),
    "secp256k1": (0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F,
                  0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141),
    "secp256r1": (0xFFFFFFFF00000001000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFF,
                  0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551),
    "secp384r1": (2**384 - 2**128 - 2**96 + 2**32 - 1,
                  0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFC7634D81F4372DDF581A0DB248B0A77AECEC196ACCC52973),
    "secp521r1": (2**521 - 1,
                  0x1FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFA51868783BF2F966B7FCC0148F709A5D03BB5C9B8899C47AEBB6FB71E91386409),
    "brainpoolP160r1": (0xE95E4A5F737059DC60DFC7AD95B3D8139515620F, 0xE95E4A5F737059DC60DF5991D45029409E60FC09),
    "brainpoolP192r1": (0xC302F41D932A36CDA7A3463093D18DB78FCE476DE1A86297, 0xC302F41D932A36CDA7A3462F9E9E916B5BE8F1029AC4ACC1),
    "brainpoolP224r1": (0xD7C134AA264366862A18302575D1D787B09F075797DA89F57EC8C0FF, 0xD7C134AA264366862A18302575D0FB98D116BC4B6DDEBCA3A5A7939F),
    "brainpoolP256r1": (0xA9FB57DBA1EEA9BC3E660A909D838D726E3BF623D52620282013481D1F6E5377, 0xA9FB57DBA1EEA9BC3E660A909D838D718C397AA3B561A6F7901E0E82974856A7),
    "brainpoolP320r1": (0xD35E472036BC4FB7E13C785ED201E065F98FCFA6F6F40DEF4F92B9EC7893EC28FCD412B1F1B32E27,
                         0xD35E472036BC4FB7E13C785ED201E065F98FCFA5B68F12A32D482EC7EE8658E98691555B44C59311),
    "brainpoolP384r1": (0x8CB91E82A3386D280F5D6F7E50E641DF152F7109ED5456B412B1DA197FB71123ACD3A729901D1A71874700133107EC53,
                         0x8CB91E82A3386D280F5D6F7E50E641DF152F7109ED5456B31F166E6CAC0425A7CF3AB6AF6B7FC3103B883202E9046565),
    "brainpoolP512r1": (0xAADD9DB8DBE9C48B3FD4E6AE33C9FC07CB308DB3B3C9D20ED6639CCA703308717D4D9B009BC66842AECDA12AE6A380E62881FF2F2D82C68528AA6056583A48F3,
                         0xAADD9DB8DBE9C48B3FD4E6AE33C9FC07CB308DB3B3C9D20ED6639CCA70330870553E5C414CA92619418661197FAC10471DB1D381085DDADDB58796829CA90069),
    "Curve25519": (2**255 - 19, 2**252 + 27742317777372353535851937790883648493),
    "Curve448": (2**448 - 2**224 - 1, 2**446 - 0x8335DC163BB124B65129C96FDE933D8D723A70AADC873D6D54A7BB0D),
    "BLS12-381": (0x1A0111EA397FE69A4B1BA7B6434BACD764774B84F38512BF6730D2A0F6B0F6241EABFFFEB153FFFFB9FEFFFFFFFFAAAB,
                   0x73EDA753299D7D483339D80809A1D80553BDA402FFFE5BFEFFFFFFFF00000001),
    "ed25519": (2**255 - 19, 2**252 + 27742317777372353535851937790883648493),
    "secp128r2": (0xFFFFFFFDFFFFFFFFFFFFFFFFFFFFFFFF, 0x3FFFFFFF7FFFFFFFBE0024720613B5A3),
}

# =============================================================================
# MAPPING FUNCTION (TESSERACT-AWARE, BOUNDARY-AWARE, CENTER-AWARE)
# =============================================================================

def map_to_tesseract(r, M):
    """
    Map residue r to tesseract cell.
    Returns dict with:
      - type: 'center' | 'cell'
      - octant: 0-7 or None
      - position: within-cell position
      - cell_size: size of the cell
      - boundary_distance: distance to nearest cell boundary
      - in_between: True if within 1 of a boundary
      - residue: r
    """
    if r == 0:
        return {
            "type": "center", "octant": None, "position": None,
            "cell_size": 0, "boundary_distance": 0, "in_between": False,
            "residue": 0,
        }
    
    cell_size = (M - 1) // 8
    remainder = (M - 1) % 8
    
    # Calculate boundaries for uneven distribution if remainder != 0
    boundaries = [0]
    for i in range(8):
        boundaries.append(boundaries[-1] + cell_size + (1 if i < remainder else 0))
    
    for i in range(8):
        if boundaries[i] < r <= boundaries[i+1]:
            pos = r - boundaries[i] - 1
            actual = boundaries[i+1] - boundaries[i]
            dist_lower = r - boundaries[i]
            dist_upper = boundaries[i+1] - r
            bdist = min(dist_lower, dist_upper)
            return {
                "type": "cell", "octant": i, "position": pos,
                "cell_size": actual, "boundary_distance": bdist,
                "in_between": bdist <= 1, "residue": r,
            }
    
    return {"type": "error", "residue": r}

# =============================================================================
# SHAPE SIGNATURE
# =============================================================================

def shape_signature(constants, M):
    """
    Compute the shape signature of a set of constants mod M.
    """
    results = {name: map_to_tesseract(v % M, M) for name, v in constants.items()}
    
    cells_used = set()
    center_hits = []
    boundary_hits = []
    
    for name, res in results.items():
        if res["type"] == "center":
            center_hits.append(name)
        elif res["type"] == "cell":
            cells_used.add(res["octant"])
            if res["in_between"]:
                boundary_hits.append((name, res["octant"]))
    
    def pair_count(map_fn):
        pairs = []
        names = list(results.keys())
        for i, n1 in enumerate(names):
            for n2 in names[i+1:]:
                r1, r2 = results[n1], results[n2]
                if r1["type"] == "cell" and r2["type"] == "cell":
                    if map_fn[r1["octant"]] == r2["octant"]:
                        pairs.append((n1, n2))
        return pairs
    
    return {
        "M": M,
        "cell_size": (M - 1) // 8,
        "remainder": (M - 1) % 8,
        "clean": (M - 1) % 8 == 0,
        "results": results,
        "cells_used": sorted(cells_used),
        "n_cells": len(cells_used),
        "center_hits": center_hits,
        "boundary_hits": boundary_hits,
        "antipodal_pairs": pair_count(ANTIPODAL),
        "mirror_x_pairs": pair_count(MIRROR_X),
        "mirror_y_pairs": pair_count(MIRROR_Y),
        "mirror_z_pairs": pair_count(MIRROR_Z),
        "pure_used": sorted([c for c in cells_used if c in PURE_CELLS]),
        "mixed_used": sorted([c for c in cells_used if c in MIXED_CELLS]),
    }

# =============================================================================
# MULTI-SPHERE SWEEP
# =============================================================================

def sweep_spheres(p, n):
    """
    Sweep a range of sphere sizes for one curve.
    """
    constants = {"p": p, "n": n}
    
    base = p + n
    offsets = [-100, -50, -20, -10, -5, -3, -2, -1, 0, 1, 2, 3, 5, 10, 20, 50, 100]
    carmichael = [561, 1121, 1729, 2465, 2821, 6601, 8911, 10585, 15841, 29341]
    hasse = isqrt(4 * p) + 1
    
    M_set = set()
    for d in offsets:
        M_set.add(base + d)
    for c in carmichael:
        M_set.add(c)
    M_set.add(hasse)
    
    M_list = sorted([M for M in M_set if M > 1])
    
    sigs = []
    for M in M_list:
        sig = shape_signature(constants, M)
        sig["is_tautological"] = (M == p + n + 1 or M == p + n - 1)
        sigs.append(sig)
    
    return sigs

# =============================================================================
# STATISTICAL BASELINE
# =============================================================================

def random_baseline(M, n_constants, n_trials=5000, seed=42):
    """
    Distribution of shape signatures for random residues mod M.
    """
    random.seed(seed)
    
    n_cells_list = []
    antipodal_list = []
    mirror_x_list = []
    center_list = []
    
    for _ in range(n_trials):
        rand = {f"c{i}": random.randint(1, M-1) for i in range(n_constants)}
        sig = shape_signature(rand, M)
        n_cells_list.append(sig["n_cells"])
        antipodal_list.append(len(sig["antipodal_pairs"]))
        mirror_x_list.append(len(sig["mirror_x_pairs"]))
        center_list.append(len(sig["center_hits"]))
    
    return {
        "n_cells_mean": sum(n_cells_list) / n_trials,
        "n_cells_dist": Counter(n_cells_list),
        "antipodal_mean": sum(antipodal_list) / n_trials,
        "antipodal_dist": Counter(antipodal_list),
        "mirror_x_mean": sum(mirror_x_list) / n_trials,
        "center_mean": sum(center_list) / n_trials,
    }

# =============================================================================
# RUN SURVEY
# =============================================================================

if __name__ == "__main__":
    print("=" * 100)
    print(" BETTER TEST: MULTI-SPHERE TESSERACT SURVEY")
    print(" Center-aware, boundary-aware, mirror-aware, tautology-aware.")
    print("=" * 100)

    # Headline stats
    headline = {
        "total_mappings": 0,
        "tautological_mappings": 0,
        "center_hits": 0,
        "boundary_hits": 0,
        "clean_spheres": 0,
    }

    for name, (p, n) in CURVES.items():
        print()
        print("=" * 100)
        print(f" CURVE: {name}")
        print("=" * 100)
        
        sigs = sweep_spheres(p, n)
        
        for sig in sigs:
            M = sig["M"]
            headline["total_mappings"] += 1
            if sig["is_tautological"]:
                headline["tautological_mappings"] += 1
            if sig["center_hits"]:
                headline["center_hits"] += len(sig["center_hits"])
            if sig["boundary_hits"]:
                headline["boundary_hits"] += len(sig["boundary_hits"])
            if sig["clean"]:
                headline["clean_spheres"] += 1
            
            # Only report non-tautological spheres in detail
            if sig["is_tautological"]:
                tag = " [TAUTOLOGICAL]"
            elif sig["clean"]:
                tag = " [CLEAN]"
            else:
                tag = ""
            
            print(f"\n  M = {M}{tag}")
            print(f"    cell_size = {sig['cell_size']}, remainder = {sig['remainder']}, clean = {sig['clean']}")
            
            for cname, res in sig["results"].items():
                if res["type"] == "center":
                    print(f"    {cname:>4} -> CENTER (r = 0)")
                else:
                    ib = " [IN-BETWEEN]" if res["in_between"] else ""
                    print(f"    {cname:>4} -> octant {res['octant']} pos {res['position']} "
                          f"(cell size {res['cell_size']}, bdist {res['boundary_distance']}){ib}")
            
            print(f"    cells used: {sig['cells_used']}")
            print(f"    pure cells: {sig['pure_used']}, mixed cells: {sig['mixed_used']}")
            print(f"    center hits: {sig['center_hits']}")
            print(f"    boundary hits: {sig['boundary_hits']}")
            print(f"    antipodal pairs: {sig['antipodal_pairs']}")
            print(f"    mirror-X pairs: {sig['mirror_x_pairs']}")
            print(f"    mirror-Y pairs: {sig['mirror_y_pairs']}")
            print(f"    mirror-Z pairs: {sig['mirror_z_pairs']}")

    # =============================================================================
    # HEADLINE SUMMARY
    # =============================================================================

    print()
    print("=" * 100)
    print(" HEADLINE SUMMARY")
    print("=" * 100)
    print(f"  Total mappings:        {headline['total_mappings']}")
    print(f"  Tautological mappings: {headline['tautological_mappings']}")
    print(f"  Clean spheres:         {headline['clean_spheres']}")
    print(f"  Center hits:           {headline['center_hits']}")
    print(f"  Boundary hits:         {headline['boundary_hits']}")
    print()
    print("  Note: tautological mappings (M = p+n±1) are flagged and excluded")
    print("        from headline statistics. They are definitional, not empirical.")

    print()
    print("=" * 100)
    print(" END OF BETTER TEST")
    print("=" * 100)
