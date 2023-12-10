# PF2e Statblocks for Obsidian

Use Markdown syntax to create great-looking Pathfinder Second Edition statblocks inside of Obsidian!

## Usage

To start an item block, create a codeblock with the language tag `pf2e-stats`, as shown:

    ```pf2e-stats
    [YOUR CONTENT HERE]
    ```

### Name

The name of the item/creature/etc is indicated with heading 1, prefixed with a single hash `#`.

### Level

The type of statblock and the item/creature/etc level is indicated with heading 2, prefixed with a double hash `##`.

### Traits

In a standard statblock, traits are signified by wrapping them in double-equals `==`, as below:

```
==Unique== ==Medium== ==Humanoid==
```

**Note:** Rarity and size tags currently do not get their specific coloration.

For abbreviated statblocks, such as the ones for brief NPC blurbs, instead use heading 3, prefixed with a triple hash `###`

### Line Breaks

To reset indentation, do two line breaks after a line.

### Dividers

Horizontal lines (three hyphens `---`) can be added to break up the sections of a statblock.

### Action Icons

You can add action icons as follows:

- One action: `` `[one-action]` ``
- Two-action activity: `` `[two-actions]` ``
- Three-action activity: `` `[three-actions]` ``
- Free action: `` `[free-action]` ``
- Reaction: `` `[reaction]` ``

## Example

![Item Example Formatted](/images/item_example.PNG)

	```pf2e-stats
	# Awesome Belt of Various Actions
	## Item 25

	---

	==Unique== ==Invested== ==Magical==

	**Price** 9,001 gp

	**Usage** worn belt; **Bulk** L

	---

	This belt enables the wearer to do all kinds of different things.

	**Activate-Buckle Spin** `[one-action]` (visual) Interact; **Effect** You spin the belt's fabulous buckle.  Select an enemy creature within 30 feet.  It must make a DC 30 Will save.
	**Critical Success** The target is unaffected.
	**Success** The target is dazzled until the beginning on your next turn.
	**Failure** The target is blinded until the beginning of your next turn.
	**Critical Failure** The target is blinded for 1 minute.

	**Activate-Belt Lash** `[two-actions]` (attack) Envision; **Effect** The belt whips out toward an adjacent foe.  Make an attack roll with a modifier of +35 against the target's AC.  This attack ignores your multiple attack penalty and does not increase your multiple attack penalty.  The target takes 6d6 bludgeoning damage.
	**Critical Success** The target takes double damage.
	**Success** The target takes full damage.
	**Failure** The target takes no damage.
	**Critical Failure** The belt comes free of your pants, causing them to fall down.  You are clumsy 2 until the end of your next turn.

	**Activate-Leather Storm** `[three-actions]` Envision; **Effect** The belt whirls around, buffetting anyone nearby.  Creatures within a 15-foot emanation of you take 4d8 bludgeoning damage with a DC 30 basic Reflex save.

	**Activate-Safety Strap** `[reaction]` Envision; **Trigger** You are falling and a ledge is within 15 feet; **Effect** The belt latches onto the ledge, stopping your fall.

	**Activate-Holster Throw** `[free-action]` Envision; **Trigger** You roll initiative; **Effect** The belt launches a weapon from its holster.  You Interact to draw a weapon.
	```

## Pathfinder License Notices

### Pathfinder Community Use Notice

This plugin uses trademarks and/or copyrights owned by Paizo Inc., used under Paizo's Community Use Policy (paizo.com/communityuse). We are expressly prohibited from charging you to use or access this content. This plugin is not published, endorsed, or specifically approved by Paizo. For more information about Paizo Inc. and Paizo products, visit paizo.com.

### ORC Notice

This product is licensed under the ORC License held in the Library of Congress at TX 9-307-067 and available online at various locations including paizo.com/orclicense, azoralaw.com/orclicense, and others.  All warranties are disclaimed as set forth therein.

**Attribution** This product is based on the following Licensed Material: *Pathfinder Player Core* © 2023 Paizo Inc., Designed by Logan Bonner, Jason Bulmahn, Stephen Radney-MacFarland, and Mark Seifter. Authors: Alexander Augunas, Kate Baker, Logan Bonner, Jason Bulmahn, Carlos Cabrera, Calder CaDavid, James Case, Eleanor Ferron, Steven Hammond, Joan Hong, Vanessa Hoskins, James Jacobs, Jenny Jarzabski, Erik Keith, Dustin Knight, Lyz Liddell, Luis Loza, Patchen Mortimer, Dennis Muldoon, Stephen Radney-MacFarland, Mikhail Rekun, David N. Ross, Michael Sayre, Mark Seifter, Kendra Leigh Speedling, Mark Thompson, Clark Valentine, Andrew White, Landon Winkler, and Linda Zayas-Palmer

**Reserved Material** This product contains no Reserved Material.

**Expressly Designated Licensed Material** This product contains no Expressly Designated Licensed Material.