// Dependencies
import { Date } from "./helper/date";

// Initialize pretty-logger
import PrettyLogger from "./helper/pretty-log";
const plog: PrettyLogger = new PrettyLogger(2);

import { CATEGORIES, CategoryGroup, Entry } from "./types";

export class LAG {
  heading: string = "N/A";
  telegram_message_id: number = -1;
  number: number;
  date: string = "N/A";
  content: CategoryGroup[] = [];

  constructor(message: string, telegram_message_id: number = -1) {
    // Assign Telegram message ID
    this.telegram_message_id = telegram_message_id;

    // Split message line-by-line
    const lines: string[] = message
      .split("\n")
      .filter(line => line.length > 1)
      .map(line => line.trim());

    // Assign heading (assume 1st line)
    const heading: string = lines[0];

    // Parse LAG number and assign corresponding property
    const hashtag_index: number = heading.indexOf("#");
    if (hashtag_index >= 0) {
      const ending_index: number = heading.indexOf(" ", hashtag_index);
      const number: number = Number(heading.slice(hashtag_index+1, ending_index));
      this.number = number;
    } else throw Error("LAG number not found!");

    // Assing heading property 
    this.heading = `LAG #${this.number}`;

    // Parse date and assign corresponding property
    try {
      const date: Date = new Date(heading);
      this.date = date.toString();
    } catch (error) {
      throw Error(`LAG #${this.number}: date not found!`);
    }

    // Parse category indices
    let categories_found: string[] = [];
    let category_indices: number[] = [];
    for (let i = 1; i < lines.length; i++) {
      if (isCategory(lines[i], this.number)) {
        category_indices.push(i);
        categories_found.push(lines[i]);
      }
    }
    if (category_indices.length == 0) throw Error(`LAG #${this.number}: No LAG categories found`);

    // Organize content within LAG post
    let content: CategoryGroup[] = [];  // Initialize content array
    let has_spotlight: boolean = false;
    for (let j = 0; j < category_indices.length; j++) {
      // Assign current category index and category
      const current_index: number = category_indices[j]
      const category: string = lines[current_index];

      // Instantiate <CategoryGroup> object
      let category_group: CategoryGroup = {
        category: category,
        entries: [],
      };

      // Assign index representing end of category
      const next_index: number = (j < category_indices.length-1) 
        ? category_indices[j+1]
        : lines.length;

      // Handle SPECIAL INSIGHTS category 
      if (category == "‼️ SPECIAL INSIGHTS 👀") {
        // Assign caption
        const caption: string = lines.slice(current_index+1, next_index).join("\n");

        // Instantiate <Entry> object
        const entry: Entry = {
          caption: caption,
          url: "N/A",
        };
        
        // Append Entry to CategoryGroup entries array
        category_group.entries.push(entry);
      } else {
        if (category.toLowerCase().includes("spotlight")) has_spotlight = true;

        // Check if there is an even number of lines between categories
        if (Math.abs(current_index+1 - next_index) % 2 != 0) throw Error(`LAG #${this.number}: Uneven number of captions & URLs under category: ${category}`);

        // Iterate pair-wise through captions & URLs until next category index
        for (let k = current_index+1; k < next_index-1; k+=2) {
          // Assign caption & URL
          const caption: string = lines[k];
          const url: string = lines[k+1];

          if (!isURL(url)) throw Error(`Invalid URL: ${url} under category: ${category}`);

          // Instantiate <Entry> object
          const entry: Entry = {
            caption: caption, 
            url: url,
          };

          // Append Entry to CategoryGroup entries array
          category_group.entries.push(entry);
        }
      }

      // Append CategoryGroup to content array
      content.push(category_group);
    }

    if (!has_spotlight) throw Error("No Spotlight category");

    // Assign content property
    this.content = content;
  }
}

// Check if given string contains keyphrases
export function isCategory(line: string, LAG_number: number): boolean {
  // Check if a category has been found
  let category_found = true;
  const official_categories = Object.values(CATEGORIES);
  for (const category of official_categories) {
    category_found = true; // initialize value to be true
    
    // Split category into keywords
    const keywords: string[] = category
      .split(" ")
      .filter(word => word.length > 0)
      .map(word => word.toLowerCase());

    // Check if each category keyword is present in line
    for (const keyword of keywords) {
      if (!line.toLowerCase().includes(keyword)) category_found = false;
    }

    // Exit loop if category has been found
    if (category_found) break;
  }

  // If category found, check if line is exact match to official category
  if (category_found && !official_categories.includes(line)) throw Error(`LAG #${LAG_number} contains typo on line: ${line}`);
  
  return category_found;
}

// Check if given string contains a URL
export function isURL(line: string): boolean {
  return Boolean(new URL(line));
}

  // Formats string to display LAG post with spacing convention 
export function formatString(lag: LAG): string {
  // Initialized sorted content array
  let content_sorted: CategoryGroup[] = [];

  let official_categories: string[] = Object.values(CATEGORIES);
  for (const official_category of official_categories) {
    for (const category_group of lag.content) {
      if (category_group.category == official_category) content_sorted.push(category_group);
    }
  }

  // Initialize string
  let output: string = "";

  // Append heading line
  const heading: string = `Look at Gaming #${lag.number} | ${lag.date}` + "\n";
  output += heading + "\n\n";

  // Iterate through categories
  for (let i = 0; i < content_sorted.length; i++) {
    // Assign category group
    const category_group: CategoryGroup = content_sorted[i];

    // Append category line
    output += category_group.category + "\n";

    // Append captions & URLs
    if (category_group.category == CATEGORIES["SPECIAL INSIGHTS"]) {
      // For SPECIAL INSIGHTS category, append only caption
      output += category_group.entries[0].caption + "\n\n\n";
    } else {
      // For every other category, append caption + URL
      for (let j = 0; j < category_group.entries.length; j++) {
        // Append entry
        const entry: Entry = category_group.entries[j];
        output += entry.caption + "\n"; 
        output += entry.url + "\n";

        // If not last entry, then add empty line after entry
        if (j < category_group.entries.length-1) output += "\n"
      }

      // Append 2 empty lines between categories
      if (i < content_sorted.length-1) output += "\n\n";
    }
  }
  return output;
}

